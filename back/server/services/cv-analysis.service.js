import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { parsePDF } from '../utils/pdf-parser.js';
import mammoth from 'mammoth';
import dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

class CVAnalysisService {
    constructor() {
        // Initialize Hugging Face client with the new token
        try {
            this.hf = new HfInference("");//
            console.log('Hugging Face client initialized successfully');
        } catch (error) {
            console.warn('Failed to initialize Hugging Face client:', error.message);
            this.hf = null;
        }
    }

    async readFileAsText(filePath) {
        try {
            const buffer = await fs.promises.readFile(filePath);
            return buffer.toString('utf-8');
        } catch (error) {
            console.error('Error reading file as text:', error);
            throw new Error(`Failed to read file as text: ${error.message}`);
        }
    }

    async extractTextFromPDF(filePath) {
        try {
            const dataBuffer = await fs.promises.readFile(filePath);
            const data = await parsePDF(dataBuffer);
            return data.text;
        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            throw new Error(`Failed to extract text from PDF: ${error.message}`);
        }
    }

    async extractTextFromDOCX(filePath) {
        try {
            const result = await mammoth.extractRawText({
                path: filePath
            });
            return result.value;
        } catch (error) {
            console.error('Error extracting text from DOCX:', error);
            throw new Error(`Failed to extract text from DOCX: ${error.message}`);
        }
    }

    async extractTextFromCV(filePath) {
        try {
            console.log('Attempting to extract text from:', filePath);
            
            if (!fs.existsSync(filePath)) {
                throw new Error('File does not exist');
            }

            const stats = fs.statSync(filePath);
            console.log('File stats:', stats);
            
            // Check file size - a real CV should be at least a few KB
            if (stats.size < 512) { // Reduced from 1KB to 512 bytes
                throw new Error('File is too small to be a valid CV (less than 512 bytes)');
            }
            
            const ext = path.extname(filePath).toLowerCase();
            console.log('File extension:', ext);

            let text;
            
            // Extract text based on file extension
            switch (ext) {
                case '.pdf':
                    text = await this.extractTextFromPDF(filePath);
                    break;
                case '.docx':
                    text = await this.extractTextFromDOCX(filePath);
                    break;
                case '.txt':
                case '.md':
                case '.rtf':
                    text = await this.readFileAsText(filePath);
                    break;
                default:
                    throw new Error(`Unsupported file type: ${ext}. Please upload a PDF, DOCX, or TXT file.`);
            }

            if (!text || text.trim().length === 0) {
                throw new Error('No text could be extracted from the file. The file might be empty, password-protected, or contain only images.');
            }

            // Strip out unusual characters that might indicate a non-text file
            const cleaned = text.replace(/[^\x20-\x7E\n\r\t]/g, '');
            
            // Check if there's a significant difference in length after cleaning
            // Be more lenient - allow up to 50% non-text content (changed from 30%)
            if (cleaned.length < text.length * 0.5) {
                throw new Error('File appears to contain mostly non-text content. Please ensure your CV contains actual text and not just images or formatting.');
            }

            console.log('Text extracted successfully, length:', cleaned.length);
            return cleaned; // Return the cleaned text
        } catch (error) {
            console.error('Error extracting text from CV:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                filePath,
                exists: fs.existsSync(filePath)
            });
            throw new Error(`Failed to extract text from CV: ${error.message}`);
        }
    }

    async analyzeCV(cvText) {
        try {
            // Quick validation - check if the text looks like a CV
            const lowerText = cvText.toLowerCase();
            const cvIndicators = ['experience', 'education', 'skills', 'work', 'academic', 'project'];
            const hasIndicators = cvIndicators.some(indicator => lowerText.includes(indicator));
            
            // Check if this is an IT engineering student CV - improved detection
            const isITStudent = /\b(?:IT\s+Engineer(?:ing)?\s+Student|Computer\s+Science\s+Student|Software\s+Engineering\s+Student)\b/i.test(cvText) || 
                  (lowerText.includes('student') && 
                  (lowerText.includes('it') || lowerText.includes('computer science') || lowerText.includes('software')) &&
                  (lowerText.includes('html') || lowerText.includes('css') || lowerText.includes('javascript') || 
                   lowerText.includes('python') || lowerText.includes('java') || lowerText.includes('c++')));
            
            // For IT students, prioritize specialized analysis
            if (isITStudent) {
                console.log('Detected IT Engineering Student CV - using optimized local analysis');
                return this.specializedITStudentAnalysis(cvText);
            }
            
            if (!hasIndicators) {
                console.warn('Text does not appear to contain basic CV indicators');
                // For non-text indicators, check if there might be structure indicators
                if (/\beducation\b|\bexperience\b|\bskills\b/i.test(cvText) || 
                    /\b(?:html|css|javascript|python|java|c\+\+)\b/i.test(cvText)) {
                    // It might be a CV with non-standard format
                    console.log('Found potential structure indicators - proceeding with analysis');
                } else {
                    return this.localOnlyAnalysis(cvText); // Return local analysis instead of throwing
                }
            }
            
            const sanitizedText = this.sanitizeText(cvText);
            console.log('Starting AI-powered CV analysis...');
            
            // Perform local analysis immediately for key components
            const localProfileType = this.determineProfileType(sanitizedText);
            const localSkills = this.fallbackSkillExtraction(sanitizedText);
            const localEducation = this.fallbackEducationAnalysis(sanitizedText);
            
            // Extract experience
            const localEntities = {
                organizations: this.extractOrganizations(sanitizedText),
                dates: this.extractDates(sanitizedText),
                locations: this.extractLocations(sanitizedText)
            };
            
            const localExperienceYears = await this.extractYearsOfExperience(
                localEntities.dates, 
                sanitizedText
            );

            // Set a shorter timeout for the entire analysis
            const timeout = 6000; // 6 seconds timeout - much faster than before
            
            // Run AI analyses in parallel with short timeouts
            try {
                const analysisPromise = Promise.all([
                    this.analyzeSummary(sanitizedText).catch(err => {
                        console.warn('Summary analysis failed:', err);
                        return this.generateLocalSummary(sanitizedText);
                    }),
                    this.analyzeSkills(sanitizedText, localSkills).catch(err => {
                        console.warn('Skills analysis failed:', err);
                        return { 
                            skills: localSkills, 
                            confidence: 0.7, 
                            source: 'fallback',
                            profileType: localProfileType.profileType,
                            skillSets: this.organizeSkillsByCategory(localSkills)
                        };
                    }),
                    this.analyzeRole(sanitizedText, localProfileType).catch(err => {
                        console.warn('Role analysis failed:', err);
                        return { 
                            role: [localProfileType.role], 
                            confidence: 0.7, 
                            source: 'fallback',
                            primaryRole: localProfileType.role 
                        };
                    }),
                    this.analyzePersonality(sanitizedText).catch(err => {
                        console.warn('Personality analysis failed:', err);
                        return { 
                            traits: this.generateBasicPersonalityTraits(sanitizedText),
                            confidence: 0.6, 
                            source: 'fallback' 
                        };
                    }),
                    this.analyzeEntities(sanitizedText).catch(err => {
                        console.warn('Entity analysis failed:', err);
                        return localEntities;
                    })
                ]);

            const [
                summaryAnalysis,
                skillsAnalysis,
                roleAnalysis,
                personalityAnalysis,
                entitiesAnalysis
                ] = await Promise.race([
                    analysisPromise,
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Analysis timeout')), timeout)
                    )
                ]);

                // Combine AI and local analysis results
            return this.combineAnalyses({
                summary: summaryAnalysis,
                    skills: {
                        ...skillsAnalysis,
                        skillSets: skillsAnalysis.skillSets || this.organizeSkillsByCategory(localSkills)
                    },
                    role: {
                        ...roleAnalysis,
                        primaryRole: roleAnalysis.primaryRole || localProfileType.role
                    },
                personality: personalityAnalysis,
                    entities: {
                        ...entitiesAnalysis,
                        organizations: entitiesAnalysis.organizations || localEntities.organizations
                    },
                    education: localEducation,
                    experience: {
                        years: localExperienceYears,
                        organizations: localEntities.organizations,
                        locations: localEntities.locations
                    }
                });
            } catch (error) {
                console.warn('AI analysis failed or timed out:', error);
                // Return enhanced local analysis immediately
                return this.enhancedLocalAnalysis(sanitizedText, {
                    profileType: localProfileType,
                    skills: localSkills,
                    education: localEducation,
                    experience: {
                        years: localExperienceYears,
                        organizations: localEntities.organizations,
                        locations: localEntities.locations
                    },
                    entities: localEntities
                });
            }
        } catch (error) {
            console.error('Error in CV analysis:', error);
            
            // Always fall back to local analysis instead of throwing
            console.log('Falling back to local analysis due to:', error.message);
            return this.enhancedLocalAnalysis(cvText);
        }
    }
    
    specializedITStudentAnalysis(cvText) {
        try {
            console.log('Performing specialized IT student CV analysis');
            
            // Extract core information
            const name = this.extractName(cvText);
            const profileType = {
                profileType: 'developer',
                role: 'IT Engineering Student',
                isStudent: true
            };
            
            // Extract technical skills - improved detection
            const technicalSkillsSection = this.extractSpecificSection(cvText, ['technical skills', 'skills', 'TECHNICAL SKILLS']);
            console.log('Extracted technical skills section:', technicalSkillsSection ? 'Found' : 'Not found');
            
            // First try to extract skills directly from any HTML tags (skill pills)
            const tagSkills = this.extractSkillsFromTags(cvText);
            console.log('Extracted skills from tags:', tagSkills.length > 0 ? tagSkills : 'None found');
            
            // Extract programming languages and other skills with improved detection
            const extractedSkills = this.extractTechnicalSkillsForITStudent(cvText, technicalSkillsSection);
            console.log('Extracted skills count:', extractedSkills.length);
            
            // Combine skills from tags and extracted
            const skills = [...new Set([...tagSkills, ...extractedSkills])];
            console.log('Combined skills count:', skills.length);
            
            // Extract academic projects with technologies used
            const academicProjects = this.extractAcademicProjects(cvText);
            console.log('Extracted academic projects:', academicProjects.length);
            
            // Extract technologies from projects to supplement skills
            const projectTechnologies = [];
            for (const project of academicProjects) {
                if (project.technologies && project.technologies.length > 0) {
                    projectTechnologies.push(...project.technologies);
                }
            }
            
            // Add project technologies to skills
            const combinedSkills = [...new Set([...skills, ...projectTechnologies])];
            console.log('Final combined skills count:', combinedSkills.length);
            
            // If no skills were found, use a fallback approach for IT students
            if (combinedSkills.length === 0) {
                console.log('No skills found, using fallback skill extraction for IT students');
                const fallbackSkills = this.fallbackITStudentSkills();
                combinedSkills.push(...fallbackSkills);
            }
            
            // Organize skills by category for better display
            const organizedSkills = this.organizeSkillsByCategory(combinedSkills);
            
            // Extract education
            const education = this.fallbackEducationAnalysis(cvText);
            
            // Extract experience - for students, consider projects as experience
            const entities = {
                organizations: this.extractOrganizations(cvText),
                dates: this.extractDates(cvText),
                locations: this.extractLocations(cvText)
            };
            
            // For IT students, calculate years of experience differently
            const experienceYears = academicProjects.length >= 3 ? 3 : 
                                   academicProjects.length >= 2 ? 2 : 
                                   academicProjects.length >= 1 ? 1 : 0;
            
            // Generate better summary for IT students
            const summary = this.generateITStudentSummary(cvText, name, combinedSkills, academicProjects);
            
            // Build the complete analysis result
            const result = {
                summary,
                profileType: 'developer',
                keySkills: combinedSkills.slice(0, 10),
                technicalProficiency: this.convertSkillSetsToTechnicalProficiency(organizedSkills),
                role: {
                    primaryRole: 'IT Engineering Student',
                    role: ['IT Engineering Student', 'Software Developer'],
                    confidence: 0.9,
                    source: 'specialized',
                    profileType: 'developer',
                    capabilities: [
                        { name: 'Software Development', confidence: 0.8 },
                        { name: 'Web Development', confidence: 0.8 },
                        { name: 'Problem Solving', confidence: 0.8 },
                        { name: 'Programming', confidence: 0.9 }
                    ]
                },
                skills: {
                    skills: combinedSkills,
                    confidence: 0.9,
                    source: 'specialized',
                    profileType: 'developer',
                    skillSets: organizedSkills
                },
                personality: {
                    traits: this.generateBasicPersonalityTraits(cvText),
                    confidence: 0.7,
                    source: 'specialized'
                },
                education,
                experience: {
                    years: experienceYears,
                    organizations: entities.organizations,
                    locations: entities.locations
                },
                entities,
                academicProjects
            };
            
            // Add score based on specialized IT student scoring
            result.score = this.calculateITStudentScore(result);
            
            // Add appropriate recommendation
            result.recommendation = 'IT Engineering';
            
            return result;
        } catch (error) {
            console.error('Error in specialized IT student analysis:', error);
            // Fallback to regular enhanced local analysis
            return this.enhancedLocalAnalysis(cvText);
        }
    }
    
    extractSkillsFromTags(cvText) {
        try {
            // Look for skills that appear as standalone "pills" or tags in the CV
            // Often they appear in specific formats like capitalized, inside brackets, or with specific formatting
            const tagPatterns = [
                /\[([^\]]+)\]/g,  // Look for [Skill]
                /\(([^)]+)\)/g,   // Look for (Skill)
                /\b([A-Z][A-Za-z0-9#.+]+)\b/g,  // Look for capitalized terms like HTML, JavaScript, C++
                /\b([A-Za-z0-9]+\.[A-Za-z0-9]+)\b/g, // Look for terms with dots like React.js
                /\b([A-Za-z0-9]+\/[A-Za-z0-9]+)\b/g, // Look for terms with slashes like HTML/CSS
                /\b(HTML|CSS|JavaScript|PHP|Python|C\+\+|Java|SQL|MySQL|Git)\b/g  // Common web skills
            ];
            
            const skillTags = new Set();
            
            for (const pattern of tagPatterns) {
                const matches = Array.from(cvText.matchAll(pattern));
                
                for (const match of matches) {
                    const potentialSkill = match[1] || match[0];
                    
                    // Filter out common non-skill terms and very short terms
                    if (potentialSkill.length < 2 || this.isCommonPhrase(potentialSkill)) {
                        continue;
                    }
                    
                    skillTags.add(potentialSkill.trim());
                }
            }
            
            return Array.from(skillTags);
        } catch (error) {
            console.error('Error extracting skills from tags:', error);
            return [];
        }
    }
    
    fallbackITStudentSkills() {
        // Default skills that are commonly found in IT student profiles
        return [
            'HTML', 'CSS', 'JavaScript', 'Python', 'Java', 'C++', 
            'SQL', 'Git', 'Problem Solving', 'Teamwork', 'Communication'
        ];
    }
    
    extractTechnicalSkillsForITStudent(cvText, skillsSection) {
        try {
            // Define common IT skills to look for - improved list
            const itSkills = [
                // Programming Languages
                'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'TypeScript', 'Ruby', 'Swift', 'Go',
                'Kotlin', 'Rust', 'Scala', 'C', 'Objective-C', 'R', 'Dart', 'Lua', 'MATLAB',
                
                // Web Technologies
                'HTML', 'CSS', 'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'Django',
                'Flask', 'Laravel', 'Spring Boot', 'jQuery', 'Bootstrap', 'Tailwind CSS', 'Sass',
                'Redux', 'Next.js', 'GraphQL', 'RESTful API', 'JSON', 'XML', 'WebSockets', 'PWA',
                
                // Databases
                'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle DB', 'SQLite', 'Redis',
                'Firebase', 'Elasticsearch', 'MS SQL Server', 'NoSQL', 'MariaDB',
                
                // Tools & Technologies
                'Git', 'GitHub', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD',
                'Jenkins', 'Travis CI', 'Linux', 'Unix', 'Bash', 'PowerShell', 'Webpack',
                'Babel', 'npm', 'yarn', 'VS Code', 'IntelliJ', 'Eclipse', 'XCode',
                
                // Mobile Development
                'Android', 'iOS', 'React Native', 'Flutter', 'Xamarin', 'Swift', 'Kotlin',
                'Mobile App Development', 'App Store', 'Google Play Store',
                
                // Game Development
                'Unity', 'Unreal Engine', 'Game Development', 'SDL', 'OpenGL', 'WebGL',
                
                // Embedded/Hardware
                'Arduino', 'Raspberry Pi', 'Microcontrollers', 'Embedded Systems', 'IoT',
                'PCB Design', 'Circuit Design',
                
                // UI/UX
                'UI Design', 'UX Design', 'Wireframing', 'Prototyping', 'Figma', 'Adobe XD',
                'Sketch', 'InVision', 'User Testing', 'Responsive Design',
                
                // Methodologies
                'Agile', 'Scrum', 'Kanban', 'TDD', 'BDD', 'DevOps', 'Microservices', 'OOP',
                'Functional Programming', 'Design Patterns',
                
                // Soft Skills
                'Problem Solving', 'Teamwork', 'Communication', 'Adaptability', 'Time Management',
                'Critical Thinking', 'Creativity', 'Attention to Detail',
                
                // Certifications
                'CCNA', 'AWS Certified', 'Microsoft Certified', 'CompTIA', 'Google Certified',
                'Oracle Certified', 'Cisco Certified',
                
                // Additional IT skills often found in student CVs
                'Qt Framework', 'Machine Learning', 'Symfony', 'XML', 'JSON', 'API Development'
            ];
            
            const extractedSkills = new Set();
            
            // First check the skills section if available
            if (skillsSection) {
                // Look for explicit skills listed in the skills section
                for (const skill of itSkills) {
                    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                    if (regex.test(skillsSection)) {
                        extractedSkills.add(skill);
                    }
                }
                
                // Also check for terms with slashes like HTML/CSS or Java/Python
                const slashPattern = /\b([A-Za-z\+\#]+)\/([A-Za-z\+\#]+)\b/g;
                const slashMatches = Array.from(skillsSection.matchAll(slashPattern));
                
                for (const match of slashMatches) {
                    const term1 = match[1].trim();
                    const term2 = match[2].trim();
                    
                    for (const skill of itSkills) {
                        if (skill.toLowerCase() === term1.toLowerCase() || 
                            skill.toLowerCase() === term2.toLowerCase()) {
                            extractedSkills.add(skill);
                        }
                    }
                }
            }
            
            // Then check the entire CV text for skills that weren't found in the skills section
            for (const skill of itSkills) {
                if (!extractedSkills.has(skill)) {
                    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                    if (regex.test(cvText)) {
                        extractedSkills.add(skill);
                    }
                }
            }
            
            // Try additional methods for skill extraction
            this.extractSkillsFromListFormats(cvText, extractedSkills, itSkills);
            
            // Try to find unlabeled skill sections (common in modern CVs)
            this.findUnlabeledSkillSections(cvText, extractedSkills, itSkills);
            
            return Array.from(extractedSkills);
        } catch (error) {
            console.error('Error extracting technical skills for IT student:', error);
            return [];
        }
    }
    
    extractSkillsFromListFormats(cvText, extractedSkills, itSkills) {
        try {
            // Look for bullet points, which often indicate skills
            const bulletRegex = /(?:^|\n)(?:\s*[•\-*]\s*|\s*\d+\.\s*)(.+)/g;
            const bullets = Array.from(cvText.matchAll(bulletRegex));
            
            for (const bullet of bullets) {
                const content = bullet[1].trim();
                
                // If this looks short enough to be a skill
                if (content.length < 50) {
                    // Check if it matches any known skills
                    for (const skill of itSkills) {
                        if (content.toLowerCase().includes(skill.toLowerCase())) {
                            extractedSkills.add(skill);
                        }
                    }
                    
                    // If it's very short, it might be a standalone skill not in our list
                    if (content.length < 20 && !content.includes(' ') && 
                        !this.isCommonPhrase(content) && content.length > 1) {
                        extractedSkills.add(content);
                    }
                }
            }
        } catch (error) {
            console.error('Error extracting skills from list formats:', error);
        }
    }
    
    findUnlabeledSkillSections(cvText, extractedSkills, itSkills) {
        try {
            // Modern CVs often have skill sections that are just collections of
            // standalone terms without explicit "Skills:" headers
            
            // Look for patterns like consecutive short terms separated by commas or whitespace
            const lines = cvText.split('\n');
            
            for (const line of lines) {
                // If this line is short and has multiple terms separated by commas
                if (line.length < 100 && line.includes(',')) {
                    const terms = line.split(',').map(t => t.trim());
                    
                    // If this looks like a list of skills (short terms)
                    if (terms.length > 2 && terms.every(t => t.length < 20)) {
                        for (const term of terms) {
                            // Check against known skills
                            for (const skill of itSkills) {
                                if (term.toLowerCase() === skill.toLowerCase()) {
                                    extractedSkills.add(skill);
                                }
                            }
                            
                            // Also add the term itself if it looks like a skill
                            if (term.length > 1 && !this.isCommonPhrase(term)) {
                                extractedSkills.add(term);
                            }
                        }
                    }
                }
                
                // Look for lines with multiple capitalized terms or technical-looking terms
                const techTerms = line.match(/\b([A-Z][a-z]*(?:\+\+|\.js)?)\b/g);
                if (techTerms && techTerms.length > 2) {
                    for (const term of techTerms) {
                        if (term.length > 1 && !this.isCommonPhrase(term)) {
                            extractedSkills.add(term);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error finding unlabeled skill sections:', error);
        }
    }

    extractName(text) {
        try {
            // Look for name at the beginning of the CV
            const namePatterns = [
                /^([A-Z][A-Z\s]+)(?:\n|$)/m,  // ALL CAPS name at start
                /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?:\n|$)/m,  // Proper case name
                /^([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+[A-Z][a-z]+)?(?:\n|$)/m  // First Middle Last
            ];
            
            for (const pattern of namePatterns) {
                const match = text.match(pattern);
                if (match && match[1] && match[1].length > 3) {
                    return match[1].trim();
                }
            }
            
            return '';
        } catch (error) {
            console.error('Error extracting name:', error);
            return '';
        }
    }
    
    generateITStudentSummary(cvText, name, skills, projects) {
        try {
            let summaryParts = [];
            
            // Add name if available
            if (name) {
                summaryParts.push(`${name} is an IT Engineering Student`);
            } else {
                summaryParts.push("IT Engineering Student");
            }
            
            // Add education if available
            const educationSection = this.extractEducationSection(cvText);
            if (educationSection) {
                const degreeMatch = educationSection.match(/\b(Bachelor|Master|Engineering|Computer Science|IT|Information Technology)[^.]*degree/i);
                if (degreeMatch) {
                    summaryParts[0] += ` pursuing a ${degreeMatch[0]}`;
                }
                
                const universityMatch = educationSection.match(/\b(University|College|Institute|School)[^.]{3,50}/i);
                if (universityMatch) {
                    summaryParts[0] += ` at ${universityMatch[0].trim()}`;
                }
            }
            
            // Add specialization if available
            const specializationMatch = cvText.match(/\b(specializ|focus|major)[^.]*\b(web|software|mobile|game|data|network|security|artificial intelligence|machine learning)\b[^.]*/i);
            if (specializationMatch) {
                summaryParts.push(`Specializing in ${specializationMatch[2]} development`);
            }
            
            // Add key skills (up to 5)
            const keyProgrammingSkills = skills.filter(skill => 
                ['JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'TypeScript', 'HTML', 'CSS', 'SQL'].includes(skill)
            ).slice(0, 5);
            
            if (keyProgrammingSkills.length > 0) {
                summaryParts.push(`Proficient in ${keyProgrammingSkills.join(', ')}`);
            }
            
            // Add project experience
            if (projects.length > 0) {
                const projectCount = projects.length;
                const projectTypes = projects.map(p => {
                    if (p.name.toLowerCase().includes('web')) return 'web';
                    if (p.name.toLowerCase().includes('mobile')) return 'mobile';
                    if (p.name.toLowerCase().includes('game')) return 'game';
                    if (p.name.toLowerCase().includes('desktop')) return 'desktop';
                    return 'software';
                });
                
                const uniqueProjectTypes = [...new Set(projectTypes)];
                const projectTypeText = uniqueProjectTypes.length > 1 
                    ? uniqueProjectTypes.slice(0, -1).join(', ') + ' and ' + uniqueProjectTypes.slice(-1)
                    : uniqueProjectTypes[0];
                
                summaryParts.push(`Has experience with ${projectCount} ${projectTypeText} development projects`);
            }
            
            return summaryParts.join('. ') + '.';
        } catch (error) {
            console.error('Error generating IT student summary:', error);
            return name ? `${name} is an IT Engineering Student.` : 'IT Engineering Student with programming and development skills.';
        }
    }
    
    calculateITStudentScore(analysis) {
        try {
            // 1. Technical Skills (30 points)
            const expectedSkills = [
                'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'HTML', 'CSS',
                'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'SQL', 'MySQL',
                'MongoDB', 'PostgreSQL', 'Oracle DB', 'Git', 'GitHub', 'Linux',
                'Docker', 'AWS', 'Azure', 'Android', 'iOS', 'SDL', 'Flask', 'Django'
            ];
            
            // Get all skills from all sources
            let allSkills = [];
            if (Array.isArray(analysis.keySkills)) {
                allSkills = allSkills.concat(analysis.keySkills);
            }
            
            // Add skills from technicalProficiency
            if (analysis.technicalProficiency) {
                for (const category in analysis.technicalProficiency) {
                    if (Array.isArray(analysis.technicalProficiency[category])) {
                        allSkills = allSkills.concat(analysis.technicalProficiency[category]);
                    }
                }
            }
            
            // Count matched skills
            const normalizedSkills = [...new Set(allSkills.map(skill => {
                if (typeof skill === 'string') return skill.toLowerCase();
                return skill.name ? skill.name.toLowerCase() : '';
            }))].filter(Boolean);
            
            let matchedSkillsCount = 0;
            for (const skill of normalizedSkills) {
                for (const expectedSkill of expectedSkills) {
                    if (skill.includes(expectedSkill.toLowerCase()) || 
                        expectedSkill.toLowerCase().includes(skill)) {
                        matchedSkillsCount++;
                        break;
                    }
                }
            }
            
            let technicalSkillScore = 0;
            if (matchedSkillsCount >= 15) technicalSkillScore = 30;
            else if (matchedSkillsCount >= 10) technicalSkillScore = 25;
            else if (matchedSkillsCount >= 7) technicalSkillScore = 20;
            else if (matchedSkillsCount >= 5) technicalSkillScore = 15;
            else if (matchedSkillsCount >= 3) technicalSkillScore = 10;
            else if (matchedSkillsCount >= 1) technicalSkillScore = 5;
            
            // 2. Projects (25 points)
            const projects = analysis.academicProjects || [];
            let projectScore = 0;
            
            if (projects.length >= 4) projectScore = 25;
            else if (projects.length === 3) projectScore = 20;
            else if (projects.length === 2) projectScore = 15;
            else if (projects.length === 1) projectScore = 10;
            
            // 3. Education (15 points)
            let educationScore = 10; // Default for IT students
            
            // If education info is detailed, give more points
            if (analysis.education && analysis.education.level && analysis.education.level.length > 0) {
                educationScore = 15;
            }
            
            // 4. Technical Diversity (10 points)
            const techCategories = ['programming', 'frameworks', 'databases', 'tools', 'web'];
            let diversityScore = 0;
            let categoriesWithSkills = 0;
            
            if (analysis.technicalProficiency) {
                for (const category of techCategories) {
                    if (Array.isArray(analysis.technicalProficiency[category]) &&
                        analysis.technicalProficiency[category].length > 0) {
                        categoriesWithSkills++;
                    }
                }
            }
            
            if (categoriesWithSkills >= 4) diversityScore = 10;
            else if (categoriesWithSkills >= 3) diversityScore = 8;
            else if (categoriesWithSkills >= 2) diversityScore = 5;
            else if (categoriesWithSkills >= 1) diversityScore = 3;
            
            // 5. Soft Skills (10 points)
            let softSkillScore = 0;
            const softSkills = analysis.personality?.traits || [];
            
            if (softSkills.length >= 3) softSkillScore = 10;
            else if (softSkills.length >= 2) softSkillScore = 7;
            else if (softSkills.length >= 1) softSkillScore = 5;
            else softSkillScore = 3;
            
            // 6. Experience (5 points)
            const experienceYears = analysis.experience?.years || 0;
            let experienceScore = 0;
            
            if (experienceYears >= 2) experienceScore = 5;
            else if (experienceYears >= 1) experienceScore = 3;
            else experienceScore = 1;
            
            // 7. Summary Quality (5 points)
            let summaryScore = 0;
            const summary = analysis.summary || '';
            
            if (summary.length >= 100) summaryScore = 5;
            else if (summary.length >= 50) summaryScore = 4;
            else if (summary.length > 0) summaryScore = 3;
            else summaryScore = 1;
            
            // Calculate total score
            const total = technicalSkillScore + projectScore + educationScore + 
                         diversityScore + softSkillScore + experienceScore + summaryScore;
            
            // Log the score breakdown
            console.log('IT Student Score Calculation:', {
                technicalSkillScore,
                projectScore,
                educationScore,
                diversityScore,
                softSkillsScore: softSkillScore,
                experienceScore: experienceScore,
                summaryScore: summaryScore,
                totalScore: total
            });
            
            return {
                total,
                breakdown: {
                    keySkillsScore: technicalSkillScore,
                    projectScore: projectScore,
                    educationScore: educationScore,
                    diversityScore: diversityScore,
                    softSkillsScore: softSkillScore,
                    experienceScore: experienceScore,
                    summaryScore: summaryScore
                }
            };
        } catch (error) {
            console.error('Error calculating IT student score:', error);
            return {
                total: 50,
                breakdown: {
                    keySkillsScore: 15,
                    projectScore: 10,
                    educationScore: 10,
                    diversityScore: 5,
                    softSkillsScore: 5,
                    experienceScore: 3,
                    summaryScore: 2
                }
            };
        }
    }

    enhancedLocalAnalysis(cvText, preAnalyzedData = null) {
        try {
            const sanitizedText = this.sanitizeText(cvText);
            
            // Use pre-analyzed data if available to avoid recomputation
            const profileType = preAnalyzedData?.profileType || this.determineProfileType(sanitizedText);
            const skills = preAnalyzedData?.skills || this.fallbackSkillExtraction(sanitizedText);
            const education = preAnalyzedData?.education || this.fallbackEducationAnalysis(sanitizedText);
            const entities = preAnalyzedData?.entities || {
                organizations: this.extractOrganizations(sanitizedText),
                dates: this.extractDates(sanitizedText),
                locations: this.extractLocations(sanitizedText)
            };
            
            // Extract or use pre-computed experience years
            const experience = preAnalyzedData?.experience || {
                years: this.extractYearsOfExperience(entities.dates, sanitizedText) || 0,
                organizations: entities.organizations || [],
                locations: entities.locations || []
            };
            
            // Generate a simple summary from the first few sentences
            const summary = this.generateLocalSummary(sanitizedText);
            
            // Organize skills by category
            const organizedSkills = this.organizeSkillsByCategory(skills);
            
            // Check if this is a student profile
            const isStudent = profileType.isStudent || 
                             (profileType.role && profileType.role.toLowerCase().includes('student'));
            
            // For students, extract academic projects
            let academicProjects = [];
            if (isStudent) {
                academicProjects = this.extractAcademicProjects(sanitizedText);
                console.log('Extracted academic projects for student profile:', academicProjects);
            }
            
            // For IT/CS students, ensure proper role categorization
            let role = {
                primaryRole: profileType.role || 'Professional',
                role: [profileType.role || 'Professional'],
                confidence: 0.7,
                source: 'local',
                profileType: profileType.profileType || 'general',
                capabilities: []
            };
            
            // For IT students, add specific capabilities
            if (isStudent && (profileType.profileType === 'developer' || 
                             sanitizedText.toLowerCase().includes('it') || 
                             sanitizedText.toLowerCase().includes('computer science'))) {
                
                role.primaryRole = 'IT Engineering Student';
                role.role = ['IT Engineering Student', 'Software Developer'];
                role.profileType = 'developer';
                
                // Add capabilities based on skills
                const programmingSkills = organizedSkills.find(s => s.type === 'programming')?.skills || [];
                const webSkills = organizedSkills.find(s => s.type === 'web')?.skills || [];
                const databaseSkills = organizedSkills.find(s => s.type === 'databases')?.skills || [];
                
                if (programmingSkills.length > 0) {
                    role.capabilities.push({
                        name: 'Software Development',
                        confidence: 0.8
                    });
                }
                
                if (webSkills.length > 0) {
                    role.capabilities.push({
                        name: 'Web Development',
                        confidence: 0.8
                    });
                }
                
                if (databaseSkills.length > 0) {
                    role.capabilities.push({
                        name: 'Database Management',
                        confidence: 0.7
                    });
                }
                
                // Add general capabilities for IT students
                role.capabilities.push({
                    name: 'Problem Solving',
                    confidence: 0.7
                });
                
                role.capabilities.push({
                    name: 'Technical Analysis',
                    confidence: 0.7
                });
            }
            
            const result = {
                summary,
                profileType: profileType.profileType || 'general',
                keySkills: skills.slice(0, 10),
                technicalProficiency: this.convertSkillSetsToTechnicalProficiency(organizedSkills),
                role,
                skills: {
                    skills,
                    confidence: 0.7,
                    source: 'local',
                    profileType: profileType.profileType || 'general',
                    skillSets: organizedSkills
                },
                personality: {
                    traits: this.generateBasicPersonalityTraits(sanitizedText),
                    confidence: 0.6,
                    source: 'local'
                },
                education: education || {
                    level: [],
                    institutions: [],
                    confidence: 0.5,
                    source: 'local'
                },
                experience,
                entities,
                academicProjects: isStudent ? academicProjects : []
            };
            
            // Add score
            result.score = this.calculateCandidateScore(result);
            
            // Add recommendation
            result.recommendation = this.recommendProfileCategory(result);
            
            return result;
        } catch (error) {
            console.error('Error in enhanced local analysis:', error);
            
            // Return a minimum viable result to prevent UI crashes
            return this.generateMinimumViableResult();
        }
    }
    
    extractAcademicProjects(text) {
        try {
            const projects = [];
            
            // Look for project sections
            const projectSectionRegexes = [
                /(?:ACADEMIC\s+)?PROJECTS?(?:.+?)(?=\n\s*[A-Z][A-Z\s]+:?|\Z)/is,
                /(?:COURSE|CLASS)\s+PROJECTS?(?:.+?)(?=\n\s*[A-Z][A-Z\s]+:?|\Z)/is,
                /PERSONAL\s+PROJECTS?(?:.+?)(?=\n\s*[A-Z][A-Z\s]+:?|\Z)/is,
                /PORTFOLIO(?:.+?)(?=\n\s*[A-Z][A-Z\s]+:?|\Z)/is
            ];
            
            let projectSections = [];
            for (const regex of projectSectionRegexes) {
                const match = text.match(regex);
                if (match) {
                    projectSections.push(match[0]);
                }
            }
            
            // If no dedicated section found, look for project mentions
            if (projectSections.length === 0) {
                const projectMentionRegexes = [
                    /(?:developed|created|built|implemented|designed)(?:\s+a)?\s+([^.]+?(?:project|application|app|website|system|game))/gi,
                    /([^.]+?(?:project|application|app|website|system|game))[^.]*?(?:developed|created|built|implemented|designed)/gi
                ];
                
                for (const regex of projectMentionRegexes) {
                    const matches = Array.from(text.matchAll(regex));
                    for (const match of matches) {
                        const projectDescription = match[1].trim();
                        if (projectDescription.length > 10 && projectDescription.length < 100) {
                            projects.push({
                                name: projectDescription,
                                description: match[0],
                                technologies: this.extractTechnologiesFromContext(match[0])
                            });
                        }
                    }
                }
                
                return projects;
            }
            
            // Process project sections
            const combinedSection = projectSections.join('\n');
            
            // Look for bullet points or numbered items in project sections
            const bulletRegex = /(?:^|\n)(?:\s*[•\-*]\s*|\s*\d+\.\s*)(.+)/g;
            const bullets = Array.from(combinedSection.matchAll(bulletRegex));
            
            if (bullets.length > 0) {
                // Group bullets into projects
                let currentProject = null;
                
                for (const bullet of bullets) {
                    const content = bullet[1].trim();
                    
                    // If this looks like a project title, start a new project
                    if (/^[A-Z0-9]/.test(content) && 
                        content.length < 60 && 
                        !content.endsWith('.') && 
                        /(?:app|application|project|website|system|game|development)/i.test(content)) {
                        
                        currentProject = {
                            name: content,
                            description: '',
                            technologies: []
                        };
                        projects.push(currentProject);
                    } 
                    // Otherwise add to the current project's description
                    else if (currentProject) {
                        if (currentProject.description) {
                            currentProject.description += ' ' + content;
                        } else {
                            currentProject.description = content;
                        }
                        
                        // Extract technologies
                        const techs = this.extractTechnologiesFromContext(content);
                        if (techs.length > 0) {
                            currentProject.technologies = [...currentProject.technologies, ...techs];
                        }
                    }
                }
            } else {
                // Try to split by common project separators
                const projectChunks = combinedSection.split(/(?:\n\n|\r\n\r\n|(?:\n|^)(?=[A-Z][^a-z]*:))/);
                
                for (const chunk of projectChunks) {
                    if (chunk.trim().length < 10) continue;
                    
                    // Try to extract a title
                    const titleMatch = chunk.match(/^([A-Za-z0-9\s\-_]+)(?::|–|-|\n)/);
                    const title = titleMatch ? titleMatch[1].trim() : 'Project';
                    
                    projects.push({
                        name: title,
                        description: chunk.replace(titleMatch ? titleMatch[0] : '', '').trim(),
                        technologies: this.extractTechnologiesFromContext(chunk)
                    });
                }
            }
            
            return projects;
        } catch (error) {
            console.error('Error extracting academic projects:', error);
            return [];
        }
    }
    
    extractTechnologiesFromContext(text) {
        try {
            const techKeywords = [
                'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'HTML', 'CSS', 'SQL',
                'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask',
                'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'Firebase', 'AWS', 'Azure',
                'Git', 'Docker', 'Kubernetes', 'Linux', 'Windows', 'Android', 'iOS',
                'Swift', 'Kotlin', 'TypeScript', 'Ruby', 'Rails', 'ASP.NET', 'Spring',
                'Bootstrap', 'jQuery', 'REST API', 'GraphQL', 'TensorFlow', 'PyTorch',
                'Machine Learning', 'AI', 'Data Science', 'Big Data', 'Hadoop', 'Spark',
                'Unity', 'Unreal Engine', 'Game Development', 'WebGL', 'Three.js', 'SDL',
                'Qt', 'Arduino', 'Raspberry Pi', 'IoT', 'Embedded Systems', 'Microcontrollers',
                'Symfony', 'Laravel', 'WordPress', 'Drupal', 'Magento', 'Shopify',
                'Redux', 'MobX', 'Vuex', 'SASS', 'LESS', 'Webpack', 'Babel', 'ESLint',
                'Jest', 'Mocha', 'Chai', 'Cypress', 'Selenium', 'JUnit', 'TestNG',
                'CI/CD', 'Jenkins', 'Travis CI', 'CircleCI', 'GitHub Actions', 'GitLab CI',
                'Agile', 'Scrum', 'Kanban', 'Jira', 'Trello', 'Asana', 'Confluence'
            ];
            
            const technologies = [];
            
            for (const tech of techKeywords) {
                const regex = new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                if (regex.test(text)) {
                    technologies.push(tech);
                }
            }
            
            return technologies;
        } catch (error) {
            console.error('Error extracting technologies:', error);
            return [];
        }
    }

    generateLocalSummary(text) {
        try {
            // Check if this is a student CV
            const isStudent = /\b(?:student|undergraduate|graduate|1st year|2nd year|3rd year|4th year)\b/i.test(text);
            
            // For students, prioritize education and projects information
            if (isStudent) {
                // Extract name if possible
                const nameMatch = text.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+)/);
                const name = nameMatch ? nameMatch[1] : '';
                
                // Extract student information
                const studentInfoRegex = /\b(?:student|undergraduate|graduate)\b[^.]*?(?:in|at|studying)[^.]*?(?:IT|Computer Science|Engineering|Software|Programming|Development)/i;
                const studentInfoMatch = text.match(studentInfoRegex);
                const studentInfo = studentInfoMatch ? studentInfoMatch[0] : '';
                
                // Extract university/institution
                const universityRegex = /\b(?:at|from|studying at)\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)+(?:\s+University|College|Institute|School)?)/i;
                const universityMatch = text.match(universityRegex);
                const university = universityMatch ? universityMatch[1] : '';
                
                // Extract specialization
                const specializationRegex = /\b(?:specializing|specialized|focusing|majoring)\s+in\s+([^.]+)/i;
                const specializationMatch = text.match(specializationRegex);
                const specialization = specializationMatch ? specializationMatch[1].trim() : '';
                
                // Extract key skills (first 3-5)
                const skillsSection = this.extractSkillsSection(text);
                const skills = skillsSection ? 
                    skillsSection.split(/[,;|]/).slice(0, 5).map(s => s.trim()).filter(Boolean).join(', ') : '';
                
                // Construct a student-focused summary
                let summary = '';
                
                if (name) {
                    summary += name + ' ';
                }
                
                if (studentInfo) {
                    summary += (summary ? 'is ' : '') + studentInfo + '. ';
                } else if (university) {
                    summary += (summary ? 'is a student at ' : 'Student at ') + university + '. ';
                }
                
                if (specialization) {
                    summary += 'Specializing in ' + specialization + '. ';
                }
                
                if (skills) {
                    summary += 'Skills include ' + skills + '.';
                }
                
                if (summary) {
                    return summary;
                }
            }
            
            // Default approach for non-students or if student-specific extraction failed
            // Extract the first 2-3 sentences
            const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 10);
            let summary = sentences.slice(0, 3).join('. ');
            
            // Cap summary length
            if (summary.length > 250) {
                summary = summary.substring(0, 247) + '...';
            }
            
            // Add period if missing
            if (!summary.match(/[.!?]$/)) {
                summary += '.';
            }
            
            return summary || 'Profile summary not available.';
        } catch (error) {
            console.error('Error generating local summary:', error);
            return 'Profile summary not available.';
        }
    }

    sanitizeText(text) {
        return text
            .replace(/[^\x20-\x7E\n]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async analyzeSummary(text) {
        try {
            const result = await this.hf.summarization({
                model: 'facebook/bart-large-cnn',
                inputs: text.substring(0, 1000),
                parameters: {
                    max_length: 150,
                    min_length: 50
                }
            });
            return result.summary_text;
            } catch (error) {
            console.warn('Summary analysis failed:', error);
            return '';
        }
    }

    async analyzeSkills(text, localSkills = []) {
        try {
            // First, determine the profile type
            const profileType = await this.determineProfileType(text, localSkills);
            console.log('Detected profile type:', profileType);
            
            let skillSets = [];
            
            // First try to extract skills directly from CV text
            const extractedSkillsText = this.extractSkillsSection(text);
            const extractedSkills = extractedSkillsText
                ? extractedSkillsText.split(/[,;|]|\band\b|\bor\b/).map(s => s.trim()).filter(Boolean)
                : [];
                
            if (extractedSkills.length > 0) {
                skillSets.push({ 
                    type: 'extracted', 
                    skills: extractedSkills.map(s => ({ name: s, confidence: 1 })) 
                });
            }
            
            try {
                // Marketing Skills
                if (profileType.profileType?.includes('marketing')) {
                    const marketingSkills = await this.hf.request({
                        model: 'facebook/bart-large-mnli',
                        inputs: text,
                        task: 'zero-shot-classification',
                        parameters: {
                            candidate_labels: [
                                'digital marketing',
                                'content marketing',
                                'social media marketing',
                                'SEO',
                                'email marketing',
                                'brand management',
                                'market research',
                                'marketing analytics',
                                'campaign management',
                                'marketing strategy'
                            ],
                            multi_label: true,
                            hypothesis_template: "This person has experience in {}"
                        }
                    });
                    skillSets.push({ type: 'marketing', skills: this.processSkillScores(marketingSkills, 0.5) });
                }
                
                // SALES SKILLS
                if (profileType.profileType?.includes('sales')) {
                    const salesSkills = await this.hf.request({
                        model: 'facebook/bart-large-mnli',
                        inputs: text,
                        task: 'zero-shot-classification',
                        parameters: {
                            candidate_labels: [
                                'lead generation', 'negotiation', 'closing deals', 'prospecting', 'account management',
                                'pipeline management', 'CRM', 'customer relationship', 'territory management', 'quota attainment'
                            ],
                            multi_label: true,
                            hypothesis_template: "This person has experience in {}"
                        }
                    });
                    skillSets.push({ type: 'sales', skills: this.processSkillScores(salesSkills, 0.5) });
                }
                
                // Developer Skills
                if (profileType.profileType?.includes('developer') || profileType.profileType?.includes('engineering')) {
                    const programmingSkills = await this.hf.request({
                        model: 'facebook/bart-large-mnli',
                        inputs: text,
                        task: 'zero-shot-classification',
                        parameters: {
                            candidate_labels: [
                                'JavaScript',
                                'Python',
                                'Java',
                                'C++',
                                'PHP',
                                'Ruby',
                                'TypeScript',
                                'C#',
                                'Swift',
                                'Go'
                            ],
                            multi_label: true,
                            hypothesis_template: "This person has experience with {}"
                        }
                    });
                    
                    const frameworkSkills = await this.hf.request({
                        model: 'facebook/bart-large-mnli',
                        inputs: text,
                        task: 'zero-shot-classification',
                        parameters: {
                            candidate_labels: [
                                'React',
                                'Angular',
                                'Vue.js',
                                'Node.js',
                                'Django',
                                'Spring',
                                'Laravel',
                                'Express.js',
                                'ASP.NET',
                                'Flask'
                            ],
                            multi_label: true,
                            hypothesis_template: "This person has experience with {}"
                        }
                    });
                    
                    skillSets.push(
                        { type: 'programming', skills: this.processSkillScores(programmingSkills, 0.5) },
                        { type: 'frameworks', skills: this.processSkillScores(frameworkSkills, 0.5) }
                    );
                }
                
                // Engineering Skills
                if (profileType.profileType?.includes('engineering')) {
                    const engineeringSkills = await this.hf.request({
                        model: 'facebook/bart-large-mnli',
                        inputs: text,
                        task: 'zero-shot-classification',
                        parameters: {
                            candidate_labels: [
                                'CAD',
                                'mechanical design',
                                'electrical systems',
                                'thermal analysis',
                                'FEA',
                                'CFD',
                                'manufacturing',
                                'quality control',
                                'product development',
                                'robotics'
                            ],
                            multi_label: true,
                            hypothesis_template: "This person has experience with {}"
                        }
                    });
                    skillSets.push({ type: 'engineering', skills: this.processSkillScores(engineeringSkills, 0.5) });
                }
                
                // Web Designer Skills
                if (profileType.profileType?.includes('designer')) {
                    const designSkills = await this.hf.request({
                        model: 'facebook/bart-large-mnli',
                        inputs: text,
                        task: 'zero-shot-classification',
                        parameters: {
                            candidate_labels: [
                                'UI Design',
                                'UX Design',
                                'Responsive Design',
                                'Web Design',
                                'Adobe XD',
                                'Figma',
                                'Sketch',
                                'Adobe Photoshop',
                                'Adobe Illustrator',
                                'Wireframing'
                            ],
                            multi_label: true,
                            hypothesis_template: "This person has experience with {}"
                        }
                    });
                    skillSets.push({ type: 'design', skills: this.processSkillScores(designSkills, 0.5) });
                }
                
                // Common Professional Skills
                const professionalSkills = await this.hf.request({
                    model: 'facebook/bart-large-mnli',
                    inputs: text,
                    task: 'zero-shot-classification',
                    parameters: {
                        candidate_labels: [
                            'project management',
                            'team leadership',
                            'problem solving',
                            'communication',
                            'time management',
                            'collaboration',
                            'analytical thinking',
                            'attention to detail',
                            'creativity',
                            'adaptability'
                        ],
                        multi_label: true,
                        hypothesis_template: "This person demonstrates {}"
                    }
                });
                skillSets.push({ type: 'professional', skills: this.processSkillScores(professionalSkills, 0.5) });
                
                // Tools and Technologies
                const toolsSkills = await this.hf.request({
                    model: 'facebook/bart-large-mnli',
                    inputs: text,
                    task: 'zero-shot-classification',
                    parameters: {
                        candidate_labels: [
                            'Git',
                            'JIRA',
                            'AWS',
                            'Docker',
                            'Google Analytics',
                            'Microsoft Office',
                            'Slack',
                            'Adobe Creative Suite',
                            'Visual Studio Code',
                            'WordPress'
                        ],
                        multi_label: true,
                        hypothesis_template: "This person has experience with {}"
                    }
                });
                skillSets.push({ type: 'tools', skills: this.processSkillScores(toolsSkills, 0.5) });
            } catch (apiError) {
                console.warn('Hugging Face API request failed:', apiError);
                console.log('Falling back to keyword extraction for skills analysis...');
                
                // Fallback to local skills if available
                if (Array.isArray(localSkills) && localSkills.length > 0) {
                    // Used local skills passed from parameters
                    const organizedSkills = this.organizeSkillsByCategory(localSkills);
                    return {
                        profileType: profileType.profileType || 'general',
                        skillSets: organizedSkills
                    };
                }
                
                // Otherwise extract skills from CV text using keyword matching
                const extractedLocalSkills = this.fallbackSkillExtraction(text);
                skillSets = this.organizeSkillsByCategory(extractedLocalSkills);
            }
            
            // Ensure at least the basic categories exist in the result
            return {
                profileType: profileType.profileType || 'general',
                skillSets: skillSets.length > 0 ? skillSets : this.organizeSkillsByCategory(
                    Array.isArray(localSkills) && localSkills.length > 0 
                        ? localSkills 
                        : this.fallbackSkillExtraction(text)
                )
            };
        } catch (error) {
            console.warn('Skills analysis failed:', error);
            
            // Always provide a valid fallback
            return { 
                profileType: 'general',
                skillSets: this.organizeSkillsByCategory(
                    Array.isArray(localSkills) && localSkills.length > 0 
                        ? localSkills 
                        : this.fallbackSkillExtraction(text)
                )
            };
        }
    }
    
    fallbackSkillExtraction(cvText) {
        try {
            // Define categories of technical skills
            const skillCategories = {
                // Technical/Engineering skills
                'engineering': [
                    'mechanical design', 'CAD', 'Solidworks', 'AutoCAD', 'CATIA', 'simulation',
                    'FEA', 'CFD', 'thermal analysis', 'materials', 'product development',
                    'manufacturing', 'quality control', 'GD&T', 'prototyping', '3D printing',
                    'CNC', 'machining', 'robotics', 'automation', 'IoT', 'sensors', 'PCB design',
                    'HVAC', 'structural analysis', 'fluid mechanics', 'thermodynamics', 'optimization',
                    'Arduino', 'Microcontrollers', 'embedded systems', 'circuit design', 'SDL'
                ],
                // Programming languages
                'programming': [
                    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Go',
                    'TypeScript', 'R', 'MATLAB', 'Scala', 'Perl', 'Rust', 'C', 'Objective-C', 'VBA',
                    'Shell', 'Bash', 'PowerShell', 'PL/SQL', 'Groovy', 'Haskell', 'COBOL', 'Fortran',
                    'Assembly', 'Dart', 'Lua', 'Clojure', 'Elixir', 'F#', 'Julia'
                ],
                // Web technologies
                'web': [
                    'HTML', 'CSS', 'React', 'Angular', 'Vue.js', 'Node.js', 'Express', 'Django',
                    'Flask', 'jQuery', 'Bootstrap', 'Tailwind CSS', 'SASS', 'LESS', 'Redux',
                    'Webpack', 'Babel', 'Next.js', 'Gatsby', 'REST API', 'GraphQL', 'JSON', 'XML',
                    'Symfony', 'Laravel', 'ASP.NET', 'JSP', 'Spring Boot', 'Ruby on Rails', 'JSF',
                    'WebSockets', 'PWA', 'Web Components', 'Svelte', 'Ember.js'
                ],
                // Database technologies
                'databases': [
                    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server', 'SQLite',
                    'DynamoDB', 'Cassandra', 'Elasticsearch', 'Firebase', 'MariaDB', 'Neo4j',
                    'Couchbase', 'NoSQL', 'SQL', 'normalization', 'indexing', 'query optimization',
                    'Oracle DB', 'Microsoft Access', 'Firestore', 'CouchDB', 'InfluxDB', 'GraphQL'
                ],
                // DevOps and tools
                'tools': [
                    'Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Linux', 'Windows',
                    'Jenkins', 'CircleCI', 'Travis CI', 'Ansible', 'Terraform', 'Puppet', 'Chef',
                    'Vagrant', 'Prometheus', 'Grafana', 'ELK Stack', 'Jira', 'Confluence', 'Bitbucket',
                    'GitHub', 'GitLab', 'npm', 'yarn', 'pip', 'Maven', 'Gradle', 'CI/CD', 'DevOps',
                    'Agile', 'Scrum', 'Kanban', 'Version Control', 'Unix'
                ],
                // Data science and machine learning
                'data': [
                    'Machine Learning', 'Deep Learning', 'Neural Networks', 'TensorFlow', 'PyTorch',
                    'scikit-learn', 'pandas', 'NumPy', 'SciPy', 'Data Mining', 'Data Analysis',
                    'Big Data', 'Hadoop', 'Spark', 'Tableau', 'Power BI', 'ETL', 'Visualization',
                    'Regression', 'Classification', 'NLP', 'Computer Vision', 'Forecasting',
                    'Statistics', 'Probability', 'Data Science', 'Data Engineering', 'Jupyter'
                ],
                // Marketing and business
                'marketing': [
                    'Digital Marketing', 'SEO', 'SEM', 'SMM', 'Content Marketing', 'Email Marketing',
                    'Google Analytics', 'Google Ads', 'Facebook Ads', 'CRM', 'Lead Generation',
                    'Market Research', 'Brand Management', 'Campaign Management', 'Copywriting',
                    'Social Media', 'A/B Testing', 'Conversion Optimization', 'Sales', 'HubSpot'
                ],
                // Design skills
                'design': [
                    'UI Design', 'UX Design', 'Photoshop', 'Illustrator', 'InDesign', 'Sketch',
                    'Figma', 'Adobe XD', 'Typography', 'Color Theory', 'Visual Design', 'Wireframing',
                    'Prototyping', 'Logo Design', 'Branding', 'Responsive Design', 'Animation',
                    'AfterEffects', 'Premiere Pro', 'Final Cut Pro', '3D Modeling', 'Blender',
                    'Game Design', 'Qt Framework'
                ],
                // Soft skills
                'professional': [
                    'Leadership', 'Communication', 'Teamwork', 'Problem Solving', 'Time Management',
                    'Adaptability', 'Critical Thinking', 'Decision Making', 'Emotional Intelligence',
                    'Conflict Resolution', 'Negotiation', 'Presentation', 'Public Speaking',
                    'Project Management', 'Creativity', 'Strategic Planning', 'Analytical Skills',
                    'Attention to Detail', 'Organization', 'Customer Service', 'Networking'
                ],
                // Networking & Security
                'networking': [
                    'Network Security', 'Firewall', 'VPN', 'TCP/IP', 'DNS', 'DHCP', 'Routing',
                    'Switching', 'LAN', 'WAN', 'Cisco', 'Wireshark', 'Penetration Testing',
                    'Ethical Hacking', 'Cryptography', 'SSL/TLS', 'OWASP', 'Vulnerability Assessment',
                    'CCNA', 'Network Administration', 'Cybersecurity', 'Subnetting'
                ],
                // Mobile Development
                'mobile': [
                    'Android', 'iOS', 'Swift', 'Kotlin', 'React Native', 'Flutter', 'Xamarin',
                    'Mobile App Development', 'Responsive Design', 'Progressive Web Apps',
                    'App Store', 'Google Play', 'Mobile UI/UX', 'Cordova', 'PhoneGap',
                    'Ionic', 'Mobile Testing', 'Cross-platform Development'
                ]
            };

            // Extract potential skills sections
            const skillSections = this.extractAllSkillSections(cvText);
            const text = skillSections.length > 0 ? skillSections.join(' ') : cvText;
            
            // Extract bullet points that might contain skills
            const bulletPoints = this.extractBulletPoints(cvText);
            
            // Look for specific technical skills sections
            const technicalSkillsSection = this.extractSpecificSection(cvText, ['technical skills', 'technical proficiency', 'programming skills']);
            
            // Look for projects section which often contains skills for students
            const projectsSection = this.extractSpecificSection(cvText, ['projects', 'academic projects', 'personal projects', 'course projects']);
            
            // Combine all text for skill searching
            const combinedText = [
                text, 
                bulletPoints.join(' '), 
                technicalSkillsSection || '',
                projectsSection || ''
            ].join(' ');
            
            // Find skills across all categories
            const foundSkills = [];
            const categoryFoundSkills = {};
            
            for (const [category, skills] of Object.entries(skillCategories)) {
                categoryFoundSkills[category] = [];
                
                for (const skill of skills) {
                    // Check for exact matches or with word boundaries
                    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                    if (regex.test(combinedText)) {
                        foundSkills.push(skill);
                        categoryFoundSkills[category].push(skill);
                    }
                }
            }
            
            // Look for non-categorized technical terms in bullet points
            const technicalTerms = this.extractTechnicalTerms(bulletPoints);
            foundSkills.push(...technicalTerms);
            
            // For student CVs, specifically look for academic projects and coursework
            if (/\b(?:student|undergraduate|graduate|university|college|school|academic)\b/i.test(cvText)) {
                const academicKeywords = [
                    'course project', 'academic project', 'class project', 'thesis',
                    'research project', 'laboratory', 'coursework', 'capstone',
                    'semester project', 'final project', 'team project'
                ];
                
                for (const keyword of academicKeywords) {
                    if (new RegExp(`\\b${keyword}\\b`, 'i').test(cvText)) {
                        // Extract the surrounding context to find skills
                        const contextRegex = new RegExp(`.{0,100}\\b${keyword}\\b.{0,100}`, 'gi');
                        const matches = Array.from(cvText.matchAll(contextRegex));
                        
                        for (const match of matches) {
                            const context = match[0];
                            // Look for technical terms in this context
                            const contextTerms = this.extractTechnicalTerms([context]);
                            foundSkills.push(...contextTerms);
                        }
                    }
                }
            }
            
            // Deduplicate skills
            return [...new Set(foundSkills)];
        } catch (error) {
            console.error('Error in fallbackSkillExtraction:', error);
            return [];
        }
    }

    extractSpecificSection(text, sectionNames) {
        try {
            for (const sectionName of sectionNames) {
                // Create a regex pattern to find the section and its content
                const pattern = new RegExp(
                    `(?:^|\\n)\\s*${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?::|\\n)([\\s\\S]*?)(?=\\n\\s*[A-Z][A-Z\\s]+(?::|\\n)|$)`, 
                    'i'
                );
                
                const match = text.match(pattern);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
            
            return null;
        } catch (error) {
            console.error(`Error extracting section ${sectionNames.join('/')}:`, error);
            return null;
        }
    }

    extractAllSkillSections(text) {
        try {
            const sectionPatterns = [
                /(?:TECHNICAL\s+)?SKILLS(?:.+?)(?=\n\s*[A-Z][A-Z\s]+:?|\Z)/is,
                /CORE\s+COMPETENC(?:Y|IES)(?:.+?)(?=\n\s*[A-Z][A-Z\s]+:?|\Z)/is,
                /TECHNICAL\s+PROFICIENC(?:Y|IES)(?:.+?)(?=\n\s*[A-Z][A-Z\s]+:?|\Z)/is,
                /PROFESSIONAL\s+SKILLS(?:.+?)(?=\n\s*[A-Z][A-Z\s]+:?|\Z)/is,
                /SOFT\s+SKILLS(?:.+?)(?=\n\s*[A-Z][A-Z\s]+:?|\Z)/is,
                /KEY\s+SKILLS(?:.+?)(?=\n\s*[A-Z][A-Z\s]+:?|\Z)/is
            ];
            
            const sections = [];
            for (const pattern of sectionPatterns) {
                const match = text.match(pattern);
                if (match) {
                    sections.push(match[0]);
                }
            }
            
            return sections;
        } catch (error) {
            console.error('Error extracting skill sections:', error);
            return [];
        }
    }

    extractBulletPoints(text) {
        try {
            // Match bullet points indicated by •, -, *, or numbered lists
            const bulletPattern = /(?:^|\n)(?:\s*[•\-*]\s*|\s*\d+\.\s*)(.+)/g;
            const bullets = [];
            
            let match;
            while ((match = bulletPattern.exec(text)) !== null) {
                bullets.push(match[1].trim());
            }
            
            return bullets;
        } catch (error) {
            console.error('Error extracting bullet points:', error);
            return [];
        }
    }

    extractTechnicalTerms(bulletPoints) {
        try {
            const technicalTerms = new Set();
            
            // Patterns for potential technical terms
            const patterns = [
                /\b[A-Z][A-Za-z0-9]+(\.js)?\b/g,  // CamelCase or PascalCase terms like ReactJS
                /\b[A-Za-z]+\+\+\b/g,  // C++, G++
                /\b[A-Za-z]+-[A-Za-z]+\b/g,  // Hyphenated terms like CI-CD
                /\b[A-Z]{2,}[0-9]*\b/g,  // Acronyms like AWS, CI/CD, GCP
                /\b\d+\.\d+\.\d+\b/g,  // Version numbers like 2.0.5
                /\b[a-z]+\.[a-z]+\b/g  // Terms like require.js
            ];
            
            for (const bullet of bulletPoints) {
                for (const pattern of patterns) {
                    const matches = bullet.matchAll(pattern);
                    for (const match of matches) {
                        const term = match[0];
                        // Filter out common non-technical terms or lone numbers
                        if (term.length > 1 && 
                            !/^(The|And|For|With|This|That|These|Those|From|Have|Been|Will|Should)$/i.test(term) &&
                            !/^\d+$/.test(term)) {
                            technicalTerms.add(term);
                        }
                    }
                }
            }
            
            return Array.from(technicalTerms);
        } catch (error) {
            console.error('Error extracting technical terms:', error);
        return [];
    }
    }

    async analyzeRole(text) {
        try {
            const profileType = await this.determineProfileType(text);
            let roleLabels;
            // Define role labels based on profile type
            switch (profileType.type) {
                case 'marketing':
                case 'marketing professional':
                    roleLabels = [
                        'Marketing Manager',
                        'Digital Marketing Specialist',
                        'Content Marketing Manager',
                        'Social Media Manager',
                        'Brand Manager',
                        'Marketing Analyst',
                        'SEO Specialist',
                        'Marketing Coordinator'
                    ];
                    break;
                case 'developer':
                case 'software developer':
                    roleLabels = [
                        'Full Stack Developer',
                        'Frontend Developer',
                        'Backend Developer',
                        'Software Engineer',
                        'Mobile Developer',
                        'DevOps Engineer',
                        'API Developer',
                        'Application Developer'
                    ];
                    break;
                case 'designer':
                case 'web designer':
                    roleLabels = [
                        'UI/UX Designer',
                        'Web Designer',
                        'Visual Designer',
                        'Product Designer',
                        'Interface Designer',
                        'UX Developer',
                        'Creative Designer',
                        'Digital Designer'
                    ];
                    break;
                case 'sales':
                case 'sales professional':
                    roleLabels = [
                        'Sales Manager',
                        'Account Executive',
                        'Business Development Manager',
                        'Sales Representative',
                        'Account Manager',
                        'Regional Sales Manager',
                        'Inside Sales',
                        'Outside Sales'
                    ];
                    break;
                default:
                    roleLabels = [
                        'Professional',
                        'Specialist',
                        'Coordinator',
                        'Manager',
                        'Analyst',
                        'Administrator',
                        'Assistant',
                        'Consultant'
                    ];
            }

            try {
                const result = await this.hf.request({
                    model: 'facebook/bart-large-mnli',
                    inputs: text,
                    task: 'zero-shot-classification',
                    parameters: {
                        candidate_labels: roleLabels,
                        multi_label: false,
                        hypothesis_template: "This person's experience matches a {}"
                    }
                });

                // Get role-specific capabilities
                const capabilityLabels = this.getRoleSpecificCapabilities(profileType.type);
                const capabilities = await this.hf.request({
                    model: 'facebook/bart-large-mnli',
                    inputs: text,
                    task: 'zero-shot-classification',
                    parameters: {
                        candidate_labels: capabilityLabels,
                        multi_label: true,
                        hypothesis_template: "This person has strong capabilities in {}"
                    }
                });

                return {
                    primaryRole: result.labels[0],
                    confidence: result.scores[0],
                    profileType: profileType.type,
                    capabilities: this.processSkillScores(capabilities)
                };
            } catch (apiError) {
                console.warn('Role API analysis failed, using fallback:', apiError);
                // Fallback role analysis based on profile type and text matching
                return this.fallbackRoleAnalysis(text, profileType.type, roleLabels);
            }
        } catch (error) {
            console.warn('Role analysis failed completely:', error);
            return { 
                primaryRole: 'Professional',
                confidence: 0.5,
                profileType: 'general',
                capabilities: []
            };
        }
    }
    
    fallbackRoleAnalysis(text, profileType, roleLabels) {
        const lowerText = text.toLowerCase();
        
        // Attempt to find exact role matches in the text
        let matchedRole = null;
        let highestConfidence = 0;
        
        // Look for exact matches of role titles in the text
        for (const role of roleLabels) {
            if (lowerText.includes(role.toLowerCase())) {
                matchedRole = role;
                highestConfidence = 0.8;
                break;
            }
        }
        
        // If no direct match, try to infer from common job titles
        if (!matchedRole) {
            if (lowerText.includes('sales representative')) {
                matchedRole = 'Sales Representative';
                highestConfidence = 0.8;
            } else if (lowerText.includes('marketing manager')) {
                matchedRole = 'Marketing Manager';
                highestConfidence = 0.8;
            } else if (lowerText.includes('developer') || lowerText.includes('engineer')) {
                matchedRole = 'Software Engineer';
                highestConfidence = 0.7;
            } else if (lowerText.includes('designer')) {
                matchedRole = 'UI/UX Designer'; 
                highestConfidence = 0.7;
            } else if (profileType.includes('sales')) {
                matchedRole = 'Sales Professional';
                highestConfidence = 0.6;
            } else if (profileType.includes('marketing')) {
                matchedRole = 'Marketing Professional';
                highestConfidence = 0.6;  
            } else if (profileType.includes('developer')) {
                matchedRole = 'Software Developer';
                highestConfidence = 0.6;
            } else if (profileType.includes('designer')) {
                matchedRole = 'Designer';
                highestConfidence = 0.6;
            } else {
                matchedRole = 'Professional';
                highestConfidence = 0.5;
            }
        }
        
        // Generate basic capabilities based on profile type
        const capabilities = [];
        
        if (profileType.includes('sales')) {
            capabilities.push(
                {name: 'Client Relations', confidence: 0.7},
                {name: 'Negotiation', confidence: 0.7},
                {name: 'Business Development', confidence: 0.6}
            );
        } else if (profileType.includes('marketing')) {
            capabilities.push(
                {name: 'Marketing Strategy', confidence: 0.7},
                {name: 'Content Creation', confidence: 0.7},
                {name: 'Campaign Management', confidence: 0.6}
            );
        } else if (profileType.includes('developer')) {
            capabilities.push(
                {name: 'Software Development', confidence: 0.7},
                {name: 'Problem Solving', confidence: 0.7},
                {name: 'Code Architecture', confidence: 0.6}
            );
        } else if (profileType.includes('designer')) {
            capabilities.push(
                {name: 'Visual Design', confidence: 0.7},
                {name: 'User Experience', confidence: 0.7},
                {name: 'Creative Thinking', confidence: 0.6}
            );
        } else {
            capabilities.push(
                {name: 'Communication', confidence: 0.7},
                {name: 'Organization', confidence: 0.7},
                {name: 'Problem Solving', confidence: 0.6}
            );
        }
        
        return {
            primaryRole: matchedRole,
            confidence: highestConfidence,
            profileType: profileType,
            capabilities: capabilities
        };
    }

    getRoleSpecificCapabilities(profileType) {
        switch (profileType) {
            case 'marketing professional':
                return [
                    'Campaign Strategy',
                    'Brand Development',
                    'Market Analysis',
                    'Content Strategy',
                    'Digital Marketing',
                    'Lead Generation'
                ];
            case 'software developer':
                return [
                    'Code Architecture',
                    'API Development',
                    'Database Design',
                    'System Integration',
                    'Performance Optimization',
                    'Technical Leadership'
                ];
            case 'web designer':
                return [
                    'Visual Design',
                    'User Experience',
                    'Interaction Design',
                    'Prototyping',
                    'Design Systems',
                    'Responsive Design'
                ];
            default:
                return [
                    'Project Management',
                    'Team Leadership',
                    'Strategic Planning',
                    'Problem Solving',
                    'Communication',
                    'Innovation'
                ];
        }
    }

    async analyzePersonality(text) {
        try {
            const result = await this.hf.request({
                model: 'facebook/bart-large-mnli',
                inputs: text,
                task: 'zero-shot-classification',
                                parameters: {
                                    candidate_labels: [
                        'leadership',
                        'innovation',
                        'analytical',
                        'communication',
                        'teamwork',
                        'detail-oriented',
                        'problem-solving',
                        'adaptability'
                    ],
                    multi_label: true,
                    hypothesis_template: "This person demonstrates {}"
                }
            });
            return this.processSkillScores(result);
        } catch (error) {
            console.warn('Personality analysis failed:', error);
            return [];
        }
    }

    async analyzeEntities(text) {
        try {
            const result = await this.hf.tokenClassification({
                model: 'dslim/bert-base-NER',
                inputs: text
            });

            return this.processNERResults(result);
        } catch (error) {
            console.warn('Entity analysis failed:', error);
            return {
                organizations: [],
                dates: [],
                locations: []
            };
        }
    }

    processSkillScores(result, threshold = 0.5) {
        if (!result || !result.labels) return [];
        return result.labels
            .map((label, index) => ({
                name: label,
                confidence: result.scores[index]
            }))
            .filter(skill => skill.confidence > threshold)
            .sort((a, b) => b.confidence - a.confidence);
    }

    processNERResults(nerResult) {
        const entities = {
            organizations: new Set(),
            dates: new Set(),
            locations: new Set()
        };

        nerResult
            .filter(e => e.score > 0.8)
            .forEach(e => {
                switch (e.entity_group) {
                    case 'ORG':
                        entities.organizations.add(e.word);
                        break;
                    case 'DATE':
                        entities.dates.add(e.word);
                        break;
                    case 'LOC':
                        entities.locations.add(e.word);
                        break;
                }
            });

        return {
            organizations: Array.from(entities.organizations),
            dates: Array.from(entities.dates),
            locations: Array.from(entities.locations)
        };
    }

    async analyzeExperience(text) {
        try {
            // Use Hugging Face's NER model to identify dates and durations
            const nerResult = await this.hf.tokenClassification({
                model: 'dslim/bert-base-NER',
                inputs: text
            });

            // Use zero-shot classification to identify experience-related sections
            const experienceResult = await this.hf.request({
                model: 'facebook/bart-large-mnli',
                inputs: text,
                task: 'zero-shot-classification',
                parameters: {
                    candidate_labels: [
                        'work experience',
                        'professional experience',
                        'employment history',
                        'career experience'
                    ],
                    multi_label: true,
                    hypothesis_template: "This section contains {}"
                }
            });

            // Process NER results to extract dates and durations
            const dates = nerResult
                .filter(e => e.entity_group === 'DATE' && e.score > 0.8)
                .map(e => e.word);

            // Process experience sections
            const experienceSections = experienceResult.labels
                .map((label, index) => ({
                    section: label,
                    confidence: experienceResult.scores[index]
                }))
                .filter(section => section.confidence > 0.7);

            return {
                dates,
                experienceSections,
                confidence: Math.max(...experienceResult.scores)
            };
        } catch (error) {
            console.warn('AI experience analysis failed:', error);
            return {
                dates: [],
                experienceSections: [],
                confidence: 0
            };
        }
    }

    async extractYearsOfExperience(dates, text) {
        let yearsOfExperience = 0;
        const currentYear = new Date().getFullYear();

        try {
            // Method 1: Direct year mention pattern - more patterns
            const directYearPatterns = [
                /(\d+)[\s-]*(?:year|yr)s?(?:\s+of\s+)?experience/gi,
                /experience\s*(?:of|for)\s*(\d+)[\s-]*(?:year|yr)s?/gi,
                /(?:having|with|possessing)\s*(\d+)[\s-]*(?:year|yr)s?(?:\s+of\s+)?experience/gi,
                /(\d+)[\s-]*(?:year|yr)s?(?:\s+in\s+)(?:the\s+)?(?:field|industry)/gi
            ];
            
            for (const pattern of directYearPatterns) {
                const matches = Array.from(text.matchAll(pattern));
                if (matches.length > 0) {
                    const years = matches.map(match => parseInt(match[1]));
                    const maxYears = Math.max(...years);
                    // Cap at 25 years to prevent unrealistic values
                    return Math.min(maxYears, 25);
                }
            }

            // Method 2: Extract all date ranges in the format YYYY-YYYY or YYYY to YYYY
            const dateRangePatterns = [
                /(\d{4})(?:\s*[-–—]\s*|\s+to\s+)(\d{4}|\d{2})/gi,  // Matches 2030-2035, 2030 to 2035, 2030–2035, etc.
                /(\d{4})(?:\s*[-–—]\s*|\s+to\s+)(present|current|now|today)/gi,  // Matches 2020-present, 2020 to present, etc.
                /since\s+(\d{4})/gi,  // Matches "since 2018"
                /from\s+(\d{4})(?:\s+to\s+(?:present|now|current))?/gi  // Matches "from 2018" or "from 2018 to present"
            ];

            const jobPeriods = [];

            // Process each pattern and extract date ranges
            for (const pattern of dateRangePatterns) {
                const matches = Array.from(text.matchAll(pattern));
                for (const match of matches) {
                    let startYear = parseInt(match[1]);
                    
                    if (startYear < 1950 || startYear > currentYear + 15) {
                        continue; // Skip unrealistic dates
                    }
                    
                    let endYear;
                    if (match[2] && /\d+/.test(match[2])) {
                        // Handle two-digit end years (e.g., 2020-22)
                        if (match[2].length === 2) {
                            const century = Math.floor(startYear / 100) * 100;
                            endYear = century + parseInt(match[2]);
                        } else {
                            endYear = parseInt(match[2]);
                        }
                        
                        // Handle unrealistic dates
                        if (endYear < 1950) continue;
                        
                        // Handle future dates (with a reasonable limit)
                        if (endYear > currentYear + 15) {
                            endYear = currentYear;
                        }
                    } else if (match[0].toLowerCase().includes('present') || 
                               match[0].toLowerCase().includes('now') || 
                               match[0].toLowerCase().includes('current') ||
                               match[0].toLowerCase().includes('since') ||
                               match[0].toLowerCase().includes('from') && !match[0].toLowerCase().includes('to')) {
                        endYear = currentYear;
                    } else {
                        // Default case: assume 2 years if end year can't be determined
                        endYear = startYear + 2;
                    }
                    
                    if (endYear >= startYear) {
                        jobPeriods.push({ start: startYear, end: endYear });
                    }
                }
            }

            // Sort periods by start date
            jobPeriods.sort((a, b) => a.start - b.start);
            
            // Merge overlapping periods
            if (jobPeriods.length > 0) {
                const mergedPeriods = [jobPeriods[0]];
                
                for (let i = 1; i < jobPeriods.length; i++) {
                    const current = jobPeriods[i];
                    const lastMerged = mergedPeriods[mergedPeriods.length - 1];
                    
                    if (current.start <= lastMerged.end) {
                        // Overlap found, extend the period
                        lastMerged.end = Math.max(lastMerged.end, current.end);
                    } else {
                        // No overlap, add as a new period
                        mergedPeriods.push(current);
                    }
                }
                
                // Calculate total non-overlapping experience
                yearsOfExperience = mergedPeriods.reduce((total, period) => 
                    total + (period.end - period.start), 0);
            }
            
            if (yearsOfExperience === 0) {
                // Fallback: look for job titles
                const titlePatterns = [
                    /(?:senior|lead|principal|staff|chief|head)\s+\w+/gi,
                    /(?:manager|director|executive|officer|supervisor)/gi,
                    /(?:engineer|developer|programmer|analyst|consultant)/gi,
                    /(?:intern|trainee|assistant|junior)/gi
                ];
                
                const titles = titlePatterns.flatMap(pattern => 
                    Array.from(text.matchAll(pattern)).map(match => match[0])
                );
                
                if (titles.length > 0) {
                    const seniorTitles = titles.filter(title => 
                        /senior|lead|principal|manager|director|chief/i.test(title)
                    );
                    
                    if (seniorTitles.length > 0) {
                        // Senior roles typically have more experience
                        yearsOfExperience = 5;
                    } else {
                        // Default to 2 years for other professional titles
                        yearsOfExperience = 2;
                    }
                }
            }

            // Cap at 25 years to be realistic
            yearsOfExperience = Math.min(Math.max(0, Math.round(yearsOfExperience)), 25);
            return yearsOfExperience;
        } catch (error) {
            console.warn('Error calculating years of experience:', error);
            return 0;
        }
    }

    async analyzeEducation(text) {
        try {
            // Use multiple AI models for comprehensive analysis
            const [nerResult, educationResult, summaryResult, classificationResult] = await Promise.all([
                // NER for identifying educational entities
                this.hf.tokenClassification({
                    model: 'dslim/bert-base-NER',
                    inputs: text
                }),
                // Zero-shot classification for education sections
                this.hf.request({
                    model: 'facebook/bart-large-mnli',
                    inputs: text,
                    task: 'zero-shot-classification',
                    parameters: {
                        candidate_labels: [
                            'education',
                            'academic background',
                            'educational qualifications',
                            'degrees',
                            'certifications',
                            'courses',
                            'training',
                            'university',
                            'college',
                            'school'
                        ],
                        multi_label: true,
                        hypothesis_template: "This section contains {}"
                    }
                }),
                // Summarization for education sections
                this.hf.summarization({
                    model: 'facebook/bart-large-cnn',
                    inputs: text,
                    parameters: {
                        max_length: 150,
                        min_length: 50
                    }
                }),
                // Education level classification
                this.hf.request({
                    model: 'facebook/bart-large-mnli',
                    inputs: text,
                    task: 'zero-shot-classification',
                    parameters: {
                        candidate_labels: [
                            'PhD or Doctorate',
                            'Master Degree',
                            'Bachelor Degree',
                            'High School',
                            'No Degree'
                        ],
                        multi_label: false,
                        hypothesis_template: "The person's highest education level is {}"
                    }
                })
            ]);

            // Process NER results with AI-powered entity detection
            const educationEntities = {
                institutions: new Set(),
                degrees: new Set(),
                fields: new Set(),
                dates: new Set(),
                grades: new Set(),
                achievements: new Set()
            };

            // Enhanced AI entity processing
            nerResult
                .filter(e => e.score > 0.8)
                .forEach(e => {
                    switch (e.entity_group) {
                        case 'ORG':
                            educationEntities.institutions.add(e.word);
                            break;
                        case 'DATE':
                            educationEntities.dates.add(e.word);
                            break;
                        case 'MISC':
                            educationEntities.degrees.add(e.word);
                            break;
                    }
                });

            // Process education sections with AI context
            const educationSections = educationResult.labels
                .map((label, index) => ({
                    section: label,
                    confidence: educationResult.scores[index]
                }))
                .filter(section => section.confidence > 0.7);

            // Get AI-determined education level
            const educationLevel = classificationResult.labels[0];
            const educationConfidence = classificationResult.scores[0];

            return {
                institutions: Array.from(educationEntities.institutions),
                degrees: Array.from(educationEntities.degrees),
                fields: Array.from(educationEntities.fields),
                dates: Array.from(educationEntities.dates),
                grades: Array.from(educationEntities.grades),
                achievements: Array.from(educationEntities.achievements),
                sections: educationSections,
                summary: summaryResult.summary_text,
                educationLevel,
                educationConfidence,
                confidence: Math.max(...educationResult.scores)
            };
        } catch (error) {
            console.warn('AI education analysis failed:', error);
            return {
                institutions: [],
                degrees: [],
                fields: [],
                dates: [],
                grades: [],
                achievements: [],
                sections: [],
                summary: '',
                educationLevel: 'Not specified',
                educationConfidence: 0,
                confidence: 0
            };
        }
    }

    extractSectionContent(sections, label) {
        const relevantSections = sections.filter(section => 
            section.toLowerCase().includes(label.toLowerCase())
        );
        return relevantSections.join('\n\n');
    }

    extractAchievements(text) {
        const achievements = new Set();
        
        // Extract academic achievements
        const achievementPatterns = [
            /(?:graduated|completed|earned|achieved|received).*?(?:with|in|from).*?(?:honors|distinction|merit|excellence)/gi,
            /(?:awarded|won|received).*?(?:scholarship|prize|award|medal)/gi,
            /(?:published|presented|co-authored).*?(?:paper|research|thesis|dissertation)/gi,
            /(?:ranked|placed).*?(?:top|first|second|third)/gi
        ];

        achievementPatterns.forEach(pattern => {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                achievements.add(match[0].trim());
            }
        });

        return achievements;
    }

    async determineEducationLevel(organizations, text) {
        try {
            // Use AI analysis to determine education level
            const aiAnalysis = await this.analyzeEducation(text);
            
            // Return AI-determined education level if confidence is high
            if (aiAnalysis.educationConfidence > 0.7) {
                return aiAnalysis.educationLevel;
            }

            // If AI confidence is low, try to get more context
            const contextResult = await this.hf.request({
                model: 'facebook/bart-large-mnli',
                inputs: text,
                task: 'zero-shot-classification',
                parameters: {
                    candidate_labels: [
                        'has PhD',
                        'has Masters',
                        'has Bachelors',
                        'has High School',
                        'no degree'
                    ],
                    multi_label: true,
                    hypothesis_template: "The person {}"
                }
            });

            // Find the highest confidence education level
            const educationLevels = {
                'has PhD': 'PhD',
                'has Masters': "Master's Degree",
                'has Bachelors': "Bachelor's Degree",
                'has High School': 'High School',
                'no degree': 'Not specified'
            };

            const maxConfidenceIndex = contextResult.scores.indexOf(Math.max(...contextResult.scores));
            return educationLevels[contextResult.labels[maxConfidenceIndex]] || 'Not specified';
        } catch (error) {
            console.warn('Error determining education level:', error);
            return 'Not specified';
        }
    }

    generateRecommendedRoles(technicalSkills, businessSkills) {
        const roles = [];
        const techSkillNames = technicalSkills.map(s => s.name.toLowerCase());
        const businessSkillNames = businessSkills.map(s => s.name.toLowerCase());

        // Technical roles
        if (techSkillNames.some(s => s.includes('web') || s.includes('frontend') || s.includes('backend'))) {
            roles.push('Full Stack Developer');
        }
        if (techSkillNames.some(s => s.includes('data') || s.includes('analytics'))) {
            roles.push('Data Analyst');
        }
        if (techSkillNames.some(s => s.includes('cloud') || s.includes('devops'))) {
            roles.push('DevOps Engineer');
        }

        // Business roles
        if (businessSkillNames.some(s => s.includes('marketing') || s.includes('digital'))) {
            roles.push('Marketing Specialist');
        }
        if (businessSkillNames.some(s => s.includes('project') || s.includes('management'))) {
            roles.push('Project Manager');
        }

        return roles.slice(0, 3); // Return top 3 recommended roles
    }

    generateDevelopmentAreas(analyses) {
        const profileType = analyses.role.primaryRole;
        const existingSkills = new Set([
            ...analyses.skills.business.map(s => s.name),
            ...analyses.skills.management.map(s => s.name)
        ]);

        if (profileType.includes('engineer') || profileType.includes('developer')) {
            return !existingSkills.has('cloud computing') ? 
                'Consider expanding cloud computing expertise' :
                'Focus on developing leadership and project management skills';
        } else if (profileType.includes('marketing') || profileType.includes('sales')) {
            return !existingSkills.has('data analysis') ?
                'Enhance data analysis and digital marketing capabilities' :
                'Develop strategic planning and team leadership abilities';
        }
        return 'Continue professional development in emerging industry trends';
    }

    async generateReport(cvPath) {
        try {
            console.log('Generating AI-powered report for:', cvPath);
            const cvText = await this.extractTextFromCV(cvPath);
            
            // First validate that the content is actually a CV
            const isValid = await this.isValidCV(cvText);
            if (!isValid) {
                throw new Error('The provided file does not appear to be a valid CV or resume.');
            }
            
            console.log('Text extracted and validated as CV, performing AI analysis...');
            const analysis = await this.analyzeCV(cvText);
            console.log('AI analysis complete');
            return analysis;
        } catch (error) {
            console.error('Error generating CV report:', error);
            throw new Error(`Failed to generate CV report: ${error.message}`);
        }
    }

    generateImprovementSuggestions(analysis) {
        const suggestions = [];
        
        if (analysis.keySkills.length < 3) {
            suggestions.push('diversify skill set');
        }
        
        if (!analysis.technicalProficiency.frameworks.length) {
            suggestions.push('gain experience with relevant frameworks');
        }
        
        if (analysis.softSkills.length < 2) {
            suggestions.push('demonstrate more soft skills');
        }
        
        return `Consider ${suggestions.join(', ')} to enhance professional profile.`;
    }

    calculateCandidateScore(analysis) {
        const profileType = analysis.profileType || 'general';
        console.log('Calculating score for profile type:', profileType);
        
        // Select appropriate scoring criteria based on profile type
        if (profileType.includes('marketing')) {
            return this.calculateMarketingScore(analysis);
        } else if (profileType.includes('sales')) {
            return this.calculateSalesScore(analysis); 
        } else if (profileType.includes('developer')) {
            return this.calculateTechnicalScore(analysis);
        } else if (profileType.includes('designer')) {
            return this.calculateDesignerScore(analysis);
        } else if (profileType.includes('business')) {
            return this.calculateBusinessScore(analysis);
        } else {
            // Default scoring for general or other profile types
            return this.calculateGeneralScore(analysis);
        }
    }
    
    calculateMarketingScore(analysis) {
        // 1. Key Skills Match (25 pts)
        const expectedSkills = [
            'digital marketing',
            'SEO',
            'brand management',
            'content marketing',
            'marketing strategy',
            'social media marketing',
            'email marketing',
            'campaign management',
            'marketing analytics',
            'market research'
        ];
        
        const matchedSkills = analysis.keySkills.filter(skill =>
            expectedSkills.some(exp => skill.toLowerCase().includes(exp))
        ).length;
        const keySkillsScore = Math.round((matchedSkills / Math.min(expectedSkills.length, 5)) * 25);

        // 2. Role Match (15 pts)
        const roleScore = Math.round((analysis.role.confidence || 0) * 15);

        // 3. Tools Proficiency (10 pts)
        const expectedTools = [
            'Google Analytics', 
            'HubSpot', 
            'Mailchimp', 
            'WordPress', 
            'Canva', 
            'Hootsuite',
            'Buffer',
            'Adobe Creative Suite',
            'Facebook Ads',
            'Google Ads'
        ];
        
        const tools = (analysis.technicalProficiency.tools || []);
        const matchedTools = tools.filter(tool =>
            expectedTools.some(exp => tool.toLowerCase().includes(exp.toLowerCase()))
        ).length;
        const toolsScore = Math.round((matchedTools / Math.min(expectedTools.length, 4)) * 10);

        // 4. Experience (15 pts) - higher weight for marketing
        let experienceScore = 0;
        if (analysis.experience.years >= 6) experienceScore = 15;
        else if (analysis.experience.years >= 4) experienceScore = 12;
        else if (analysis.experience.years >= 2) experienceScore = 9;
        else if (analysis.experience.years >= 1) experienceScore = 6;
        else experienceScore = 3;

        // 5. Education (10 pts)
        let educationScore = 0;
        const level = (analysis.education.level || '').toLowerCase();
        if (level.includes('master')) educationScore = 10;
        else if (level.includes('bachelor')) educationScore = 7;
        else if (level.includes('high school')) educationScore = 4;
        else educationScore = 5;

        // 6. Soft Skills (10 pts)
        const softSkills = (analysis.technicalProficiency.professional || []);
        let softSkillsScore = 0;
        if (softSkills.length >= 5) softSkillsScore = 10;
        else if (softSkills.length >= 3) softSkillsScore = 7;
        else if (softSkills.length >= 1) softSkillsScore = 4;
        else softSkillsScore = 2;

        // 7. Summary Relevance (10 pts)
        let summaryScore = 0;
        const summary = (analysis.summary || '').toLowerCase();
        if (expectedSkills.some(skill => summary.includes(skill))) summaryScore = 8;
        else if (summary.length > 50) summaryScore = 5;
        else summaryScore = 2;

        // 8. Organizations Quality (5 pts) - lower weight for marketing
        let orgScore = 0;
        const orgs = (analysis.experience.organizations || []);
        if (orgs.length >= 3) orgScore = 5;
        else if (orgs.length === 2) orgScore = 3;
        else if (orgs.length === 1) orgScore = 1;
        else orgScore = 0;

        // Total
        const total = keySkillsScore + roleScore + toolsScore + experienceScore + 
                      educationScore + softSkillsScore + summaryScore + orgScore;
        
        // Log score details for debugging
        console.log('Marketing CV Analysis Score Calculation:', {
            profileType: 'marketing',
            keySkills: {
                expected: expectedSkills,
                found: analysis.keySkills,
                matched: matchedSkills,
                score: keySkillsScore
            },
            role: {
                confidence: analysis.role.confidence,
                score: roleScore
            },
            tools: {
                expected: expectedTools,
                found: tools,
                matched: matchedTools,
                score: toolsScore
            },
            experience: {
                years: analysis.experience.years,
                score: experienceScore
            },
            education: {
                level: level,
                score: educationScore
            },
            softSkills: {
                count: softSkills.length,
                score: softSkillsScore
            },
            summary: {
                length: summary.length,
                containsKeySkills: expectedSkills.some(skill => summary.includes(skill)),
                score: summaryScore
            },
            organizations: {
                count: orgs.length,
                score: orgScore
            },
            totalScore: total
        });
        
        return {
            total,
            breakdown: {
                keySkillsScore,
                roleScore,
                toolsScore,
                experienceScore,
                educationScore,
                softSkillsScore,
                summaryScore,
                orgScore
            }
        };
    }
    
    calculateSalesScore(analysis) {
        // 1. Key Skills Match (25 pts)
        const expectedSkills = [
            'lead generation', 'negotiation', 'closing deals', 'prospecting', 'account management',
            'pipeline management', 'crm', 'customer relationship', 'territory management', 'quota attainment',
            'sales', 'business development', 'client acquisition', 'sales representative', 'inside sales',
            'outside sales', 'b2b', 'b2c', 'cold calling', 'sales strategy', 'client relations'
        ];
        
        // Combine all key skills from extracted and AI-detected
        let allKeySkills = [];
        if (Array.isArray(analysis.keySkills)) {
            allKeySkills = analysis.keySkills;
        }
        
        // Also check technicalProficiency entries
        if (analysis.technicalProficiency) {
            if (Array.isArray(analysis.technicalProficiency.sales)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.sales);
            }
            if (Array.isArray(analysis.technicalProficiency.tools)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.tools);
            }
            if (Array.isArray(analysis.technicalProficiency.extracted)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.extracted);
            }
            if (Array.isArray(analysis.technicalProficiency.professional)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.professional);
            }
        }
        
        // Remove duplicates and normalize
        allKeySkills = [...new Set(allKeySkills.map(s => s.toLowerCase()))];
        console.log('ALL SALES SKILLS (normalized):', allKeySkills);
        
        // Count matching skills from expected set
        let matchedSkillsCount = 0;
        for (const skill of allKeySkills) {
            for (const expectedSkill of expectedSkills) {
                if (skill.includes(expectedSkill.toLowerCase())) {
                    matchedSkillsCount++;
                    break;
                }
            }
        }
        
        // Give points for certain general/soft skills that are valuable for sales
        const valuableSoftSkills = ['communication', 'leadership', 'persuasion', 
                                  'problem solving', 'adaptability', 'time management',
                                  'confidence', 'motivation', 'persistence'];
        
        for (const skill of allKeySkills) {
            for (const softSkill of valuableSoftSkills) {
                if (skill.includes(softSkill.toLowerCase()) && 
                    !expectedSkills.some(es => skill.includes(es.toLowerCase()))) {
                    matchedSkillsCount += 0.5; // Count soft skills as half points
                    break;
                }
            }
        }
        
        // Calculate score (25 points max, with diminishing returns)
        let keySkillsScore = 0;
        if (matchedSkillsCount >= 10) keySkillsScore = 25;
        else if (matchedSkillsCount >= 7) keySkillsScore = 20;
        else if (matchedSkillsCount >= 5) keySkillsScore = 15;
        else if (matchedSkillsCount >= 3) keySkillsScore = 10;
        else if (matchedSkillsCount >= 1) keySkillsScore = 5;
        
        console.log('CALCULATED SALES KEY SKILLS SCORE:', keySkillsScore, 
                   '(based on', matchedSkillsCount, 'matched skills)');
        
        // Use general score but override the key skills score
        const generalScore = this.calculateGeneralScore(analysis);
        
        const result = {
            ...generalScore,
            breakdown: {
                ...generalScore.breakdown,
                keySkillsScore: keySkillsScore
            }
        };
        
        // Ensure the total score reflects our changes
        result.total = (result.total - generalScore.breakdown.keySkillsScore) + keySkillsScore;
        
        console.log('FINAL SALES SCORE CALCULATION:', 
                   'Original:', generalScore.total,
                   'New:', result.total,
                   'Difference:', result.total - generalScore.total);
        
        return result;
    }
    
    calculateBusinessScore(analysis) {
        // Business-specific score calculation (similar to marketing but with business-focused criteria)
        // For brevity, implementing core differences only
        const expectedSkills = [
            'business development',
            'management',
            'leadership',
            'strategy',
            'operations',
            'project management',
            'client relations',
            'team management',
            'business strategy',
            'sales'
        ];
        
        // Calculate scores and return similar to marketing
        // ...implementation details similar to above...
        
        // For now, use the general score calculator but log the business profile
        console.log('Business profile detected, using general score calculation');
        return this.calculateGeneralScore(analysis);
    }
    
    calculateTechnicalScore(analysis) {
        // 1. Key Skills Match (25 pts)
        const expectedSkills = [
            'javascript', 'python', 'java', 'c++', 'c#', 'php', 'typescript', 'react', 'node.js', 'angular',
            'vue.js', 'git', 'sql', 'html', 'css', 'docker', 'aws', 'linux', 'api development', 'fullstack', 
            'backend', 'frontend', 'sdl', 'arduino', 'game development', 'c', 'mysql', 'oracle db', 'unix',
            'qt', 'microcontrollers', 'embedded', 'networking', 'database', 'web development'
        ];
        
        // Combine all key skills from extracted and AI-detected
        let allKeySkills = [];
        if (Array.isArray(analysis.keySkills)) {
            allKeySkills = analysis.keySkills;
        }
        
        // Also check technicalProficiency.programming/frameworks if present
        if (analysis.technicalProficiency) {
            if (Array.isArray(analysis.technicalProficiency.programming)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.programming);
            }
            if (Array.isArray(analysis.technicalProficiency.frameworks)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.frameworks);
            }
            if (Array.isArray(analysis.technicalProficiency.databases)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.databases);
            }
            if (Array.isArray(analysis.technicalProficiency.tools)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.tools);
            }
            if (Array.isArray(analysis.technicalProficiency.web)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.web);
            }
            // Also check extracted and professional skills
            if (Array.isArray(analysis.technicalProficiency.extracted)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.extracted);
            }
            if (Array.isArray(analysis.technicalProficiency.professional)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.professional);
            }
            if (Array.isArray(analysis.technicalProficiency.engineering)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.engineering);
            }
            if (Array.isArray(analysis.technicalProficiency.mobile)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.mobile);
            }
            if (Array.isArray(analysis.technicalProficiency.networking)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.networking);
            }
        }
        
        // Remove duplicates and normalize
        allKeySkills = [...new Set(allKeySkills.map(s => {
            if (typeof s === 'string') return s.toLowerCase();
            return s.name ? s.name.toLowerCase() : '';
        }))].filter(Boolean);
        
        console.log('ALL DEVELOPER SKILLS (normalized):', allKeySkills);
        
        // Count matching skills from expected set
        let matchedSkillsCount = 0;
        for (const skill of allKeySkills) {
            for (const expectedSkill of expectedSkills) {
                if (skill.includes(expectedSkill.toLowerCase()) || 
                    expectedSkill.includes(skill.toLowerCase())) {
                    matchedSkillsCount++;
                    break;
                }
            }
        }
        
        // Give bonus points for having a diverse skill set across different categories
        let diversityBonus = 0;
        const categories = ['programming', 'frameworks', 'databases', 'tools', 'web'];
        let categoriesWithSkills = 0;
        
        for (const category of categories) {
            if (analysis.technicalProficiency && 
                Array.isArray(analysis.technicalProficiency[category]) && 
                analysis.technicalProficiency[category].length > 0) {
                categoriesWithSkills++;
            }
        }
        
        if (categoriesWithSkills >= 4) diversityBonus = 5;
        else if (categoriesWithSkills >= 3) diversityBonus = 3;
        else if (categoriesWithSkills >= 2) diversityBonus = 1;
        
        // Calculate score (25 points max, with diminishing returns)
        // Each skill contributes less as the count increases
        let keySkillsScore = 0;
        if (matchedSkillsCount >= 10) keySkillsScore = 25;
        else if (matchedSkillsCount >= 7) keySkillsScore = 20;
        else if (matchedSkillsCount >= 5) keySkillsScore = 15;
        else if (matchedSkillsCount >= 3) keySkillsScore = 10;
        else if (matchedSkillsCount >= 1) keySkillsScore = 5;
        
        // Add diversity bonus (capped at 25)
        keySkillsScore = Math.min(25, keySkillsScore + diversityBonus);
        
        console.log('CALCULATED KEY SKILLS SCORE:', keySkillsScore, 
                   '(based on', matchedSkillsCount, 'matched skills out of', allKeySkills.length, 'skills)',
                   'with diversity bonus:', diversityBonus);
        
        // Use general score but override the key skills score
        const generalScore = this.calculateGeneralScore(analysis);
        
        // For students, adjust the experience score based on academic projects
        let experienceScore = generalScore.breakdown.experienceScore;
        
        // Check if this is a student profile
        const isStudent = analysis.role && 
                         (typeof analysis.role.isStudent === 'boolean' ? 
                          analysis.role.isStudent : 
                          (analysis.role.primaryRole && analysis.role.primaryRole.toLowerCase().includes('student')));
        
        if (isStudent) {
            // For students, count projects as experience
            const projectCount = this.countProjects(analysis);
            
            if (projectCount >= 4) experienceScore = Math.max(experienceScore, 10);
            else if (projectCount >= 3) experienceScore = Math.max(experienceScore, 8);
            else if (projectCount >= 2) experienceScore = Math.max(experienceScore, 6);
            else if (projectCount >= 1) experienceScore = Math.max(experienceScore, 4);
            
            console.log('STUDENT PROFILE DETECTED - Adjusted experience score based on', 
                       projectCount, 'projects:', experienceScore);
        }
        
        const result = {
            ...generalScore,
            breakdown: {
                ...generalScore.breakdown,
                keySkillsScore: keySkillsScore,
                experienceScore: experienceScore
            }
        };
        
        // Ensure the total score reflects our changes
        result.total = (result.total - generalScore.breakdown.keySkillsScore - generalScore.breakdown.experienceScore) + 
                      keySkillsScore + experienceScore;
        
        console.log('FINAL TECHNICAL SCORE CALCULATION:', 
                   'Original:', generalScore.total,
                   'New:', result.total,
                   'Difference:', result.total - generalScore.total);
        
        return result;
    }
    
    countProjects(analysis) {
        try {
            // Check for projects in the summary
            const summary = (analysis.summary || '').toLowerCase();
            let projectCount = 0;
            
            // Count project mentions in the summary
            const projectMatches = summary.match(/project|developed|created|built|implemented/gi);
            if (projectMatches) {
                projectCount = Math.min(3, projectMatches.length);
            }
            
            // Check for GitHub or portfolio links
            if (/github\.com|gitlab\.com|portfolio/i.test(summary)) {
                projectCount++;
            }
            
            return projectCount;
        } catch (error) {
            console.error('Error counting projects:', error);
            return 0;
        }
    }
    
    calculateDesignerScore(analysis) {
        // 1. Key Skills Match (25 pts)
        const expectedSkills = [
            'ui design', 'ux design', 'user interface', 'user experience', 'web design', 
            'graphic design', 'typography', 'adobe photoshop', 'adobe illustrator', 'figma',
            'sketch', 'indesign', 'prototyping', 'wireframing', 'responsive design',
            'visual design', 'branding', 'logo design', 'illustration', 'css',
            'html', 'adobe xd', 'creative', 'color theory', 'layout'
        ];
        
        // Combine all key skills from extracted and AI-detected
        let allKeySkills = [];
        if (Array.isArray(analysis.keySkills)) {
            allKeySkills = analysis.keySkills;
        }
        
        // Also check technicalProficiency entries
        if (analysis.technicalProficiency) {
            if (Array.isArray(analysis.technicalProficiency.design)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.design);
            }
            if (Array.isArray(analysis.technicalProficiency.tools)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.tools);
            }
            if (Array.isArray(analysis.technicalProficiency.extracted)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.extracted);
            }
            if (Array.isArray(analysis.technicalProficiency.professional)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.professional);
            }
        }
        
        // Remove duplicates and normalize
        allKeySkills = [...new Set(allKeySkills.map(s => s.toLowerCase()))];
        console.log('ALL DESIGNER SKILLS (normalized):', allKeySkills);
        
        // Count matching skills from expected set
        let matchedSkillsCount = 0;
        for (const skill of allKeySkills) {
            for (const expectedSkill of expectedSkills) {
                if (skill.includes(expectedSkill.toLowerCase())) {
                    matchedSkillsCount++;
                    break;
                }
            }
        }
        
        // Give points for certain general/soft skills that are valuable for designers
        const valuableSoftSkills = ['creativity', 'attention to detail', 'team leadership', 
                                  'analytical thinking', 'adaptability', 'time management',
                                  'communication', 'problem solving'];
        
        for (const skill of allKeySkills) {
            for (const softSkill of valuableSoftSkills) {
                if (skill.includes(softSkill.toLowerCase()) && 
                    !expectedSkills.some(es => skill.includes(es.toLowerCase()))) {
                    matchedSkillsCount += 0.5; // Count soft skills as half points
                    break;
                }
            }
        }
        
        // Calculate score (25 points max, with diminishing returns)
        let keySkillsScore = 0;
        if (matchedSkillsCount >= 10) keySkillsScore = 25;
        else if (matchedSkillsCount >= 7) keySkillsScore = 20;
        else if (matchedSkillsCount >= 5) keySkillsScore = 15;
        else if (matchedSkillsCount >= 3) keySkillsScore = 10;
        else if (matchedSkillsCount >= 1) keySkillsScore = 5;
        
        console.log('CALCULATED DESIGNER KEY SKILLS SCORE:', keySkillsScore, 
                   '(based on', matchedSkillsCount, 'matched skills)');
        
        // Use general score but override the key skills score
        const generalScore = this.calculateGeneralScore(analysis);
        
        const result = {
            ...generalScore,
            breakdown: {
                ...generalScore.breakdown,
                keySkillsScore: keySkillsScore
            }
        };
        
        // Ensure the total score reflects our changes
        result.total = (result.total - generalScore.breakdown.keySkillsScore) + keySkillsScore;
        
        console.log('FINAL DESIGNER SCORE CALCULATION:', 
                   'Original:', generalScore.total,
                   'New:', result.total,
                   'Difference:', result.total - generalScore.total);
        
        return result;
    }
    
    calculateGeneralScore(analysis) {
        // Basic score calculation with dynamic skills matching
        
        // 1. Key Skills - Determine expected skills based on profile type
        let expectedSkills = [];
        const profileType = (analysis.profileType || '').toString().toLowerCase();
        
        if (profileType.includes('marketing')) {
            expectedSkills = [
                'digital marketing', 'content marketing', 'social media marketing', 'seo',
                'email marketing', 'brand management', 'market research', 'marketing analytics'
            ];
        } else if (profileType.includes('sales')) {
            expectedSkills = [
                'sales', 'negotiations', 'account management', 'business development',
                'client relations', 'crm', 'prospecting', 'lead generation'
            ];
        } else {
            // General expected skills for any professional
            expectedSkills = [
                'project management', 'leadership', 'communication', 'problem solving',
                'time management', 'teamwork', 'analytical thinking', 'organization'
            ];
        }
        
        // Gather all skills from all sources
        let allKeySkills = [];
        if (Array.isArray(analysis.keySkills)) {
            allKeySkills = analysis.keySkills;
        }
        
        // Also check all technical proficiency sections
        if (analysis.technicalProficiency) {
            for (const [key, skills] of Object.entries(analysis.technicalProficiency)) {
                if (Array.isArray(skills)) {
                    allKeySkills = allKeySkills.concat(skills);
                }
            }
        }
        
        // Remove duplicates and normalize
        allKeySkills = [...new Set(allKeySkills.map(s => {
            if (typeof s === 'string') return s.toLowerCase();
            return s.name ? s.name.toLowerCase() : '';
        }))].filter(Boolean);
        
        // Count matches (with partial matching)
        const matchedSkills = allKeySkills.filter(skill =>
            expectedSkills.some(exp => skill.includes(exp.toLowerCase()) || exp.includes(skill))
        );
        
        const keySkillsScore = Math.min(25, Math.max(5, Math.round((matchedSkills.length / 3) * 25)));

        // 2. Role Match (15 pts)
        const roleScore = Math.max(5, Math.round((analysis.role?.confidence || 0.3) * 15));

        // 3. Tools Proficiency (10 pts)
        const toolsArray = analysis.technicalProficiency?.tools || [];
        let toolsScore = Math.min(10, Math.max(3, Math.round((toolsArray.length / 3) * 10)));

        // 4. Experience (15 pts)
        let experienceScore = 0;
        const years = analysis.experience?.years || 0;
        if (years >= 6) experienceScore = 15;
        else if (years >= 4) experienceScore = 12;
        else if (years >= 2) experienceScore = 9;
        else if (years >= 1) experienceScore = 6;
        else experienceScore = 3;

        // 5. Education (10 pts)
        let educationScore = 0;
        const level = ((analysis.education?.level || '') + '').toLowerCase();
        if (level.includes('master') || level.includes('phd') || level.includes('doctorate')) educationScore = 10;
        else if (level.includes('bachelor')) educationScore = 8;
        else if (level.includes('high school')) educationScore = 5;
        else educationScore = 5;

        // 6. Soft Skills (10 pts)
        const softSkills = (analysis.technicalProficiency?.professional || []);
        let softSkillsScore = 0;
        if (softSkills.length >= 4) softSkillsScore = 10;
        else if (softSkills.length >= 2) softSkillsScore = 7;
        else if (softSkills.length >= 1) softSkillsScore = 5;
        else softSkillsScore = 3;

        // 7. Summary Quality (10 pts)
        let summaryScore = 0;
        const summary = (analysis.summary || '');
        if (summary.length > 150) summaryScore = 8;
        else if (summary.length > 75) summaryScore = 5;
        else if (summary.length > 0) summaryScore = 3;
        else summaryScore = 2;

        // 8. Organizations Quality (5 pts)
        let orgScore = 0;
        const orgs = (analysis.experience?.organizations || []);
        if (orgs.length >= 3) orgScore = 5;
        else if (orgs.length === 2) orgScore = 4;
        else if (orgs.length === 1) orgScore = 3;
        else orgScore = 1;

        // Total
        const total = keySkillsScore + roleScore + toolsScore + experienceScore + 
                      educationScore + softSkillsScore + summaryScore + orgScore;
        
        // Log score details for debugging
        console.log('General CV Analysis Score Calculation:', {
            profileType,
            keySkills: {
                expected: expectedSkills,
                found: allKeySkills,
                matched: matchedSkills,
                score: keySkillsScore
            },
            role: {
                confidence: analysis.role?.confidence,
                score: roleScore
            },
            tools: {
                count: toolsArray.length,
                score: toolsScore
            },
            experience: {
                years: years,
                score: experienceScore
            },
            education: {
                level: level,
                score: educationScore
            },
            softSkills: {
                count: softSkills.length,
                score: softSkillsScore
            },
            summary: {
                length: summary.length,
                score: summaryScore
            },
            organizations: {
                count: orgs.length,
                score: orgScore
            },
            totalScore: total
        });
        
        return {
            total,
            breakdown: {
                keySkillsScore,
                roleScore,
                toolsScore,
                experienceScore,
                educationScore,
                softSkillsScore,
                summaryScore,
                orgScore
            }
        };
    }

    recommendProfileCategory(analysis) {
        const type = (analysis.profileType || '').toLowerCase();
        const primaryRole = (analysis.role?.primaryRole || '').toLowerCase();
        if (type.includes('marketing') || primaryRole.includes('marketing')) {
            return 'Marketing';
        }
        if (type.includes('developer') || type.includes('technical') || primaryRole.includes('developer') || primaryRole.includes('engineer')) {
            return 'Developer';
        }
        if (type.includes('design') || primaryRole.includes('designer')) {
            return 'Designer';
        }
        if (type.includes('sales') || primaryRole.includes('sales')) {
            return 'Sales Manager';
        }
        return 'General Professional';
    }

    async combineAnalyses(analyses) {
        try {
            // Get all skills across categories
            const allSkills = analyses.skills.skillSets.flatMap(set => 
                set.skills.map(skill => ({
                    ...skill,
                    category: set.type
                }))
            ).sort((a, b) => b.confidence - a.confidence);

            // Get top skills
            const keySkills = allSkills.slice(0, 8).map(skill => skill.name);

            // Calculate experience
            const yearsOfExperience = await this.extractYearsOfExperience(
                analyses.entities.dates,
                analyses.summary || ''
            );

            // Determine education
            const educationLevel = await this.determineEducationLevel(
                analyses.entities.organizations,
                analyses.summary || ''
            );

            // Organize skills by category
            const technicalProficiency = {};
            analyses.skills.skillSets.forEach(set => {
                technicalProficiency[set.type] = set.skills
                    .filter(skill => skill.confidence > 0.7)
                    .map(skill => skill.name);
            });

            // Check if this is a student profile
            const isStudent = analyses.role && 
                             (analyses.role.primaryRole?.toLowerCase().includes('student') || 
                              analyses.skills.profileType?.toLowerCase().includes('student'));
            
            // For students, extract academic projects if not already present
            let academicProjects = [];
            if (isStudent && !analyses.academicProjects) {
                academicProjects = this.extractAcademicProjects(analyses.summary || '');
            } else if (analyses.academicProjects) {
                academicProjects = analyses.academicProjects;
            }

            const result = {
                summary: analyses.summary,
                profileType: analyses.skills.profileType,
                keySkills,
                technicalProficiency,
                role: analyses.role,
                experience: {
                    years: yearsOfExperience,
                    organizations: analyses.entities.organizations,
                    locations: analyses.entities.locations
                },
                education: {
                    level: educationLevel,
                    institutions: analyses.entities.organizations
                        .filter(org => org.toLowerCase().includes('university') || 
                                     org.toLowerCase().includes('college') || 
                                     org.toLowerCase().includes('school'))
                },
                personality: analyses.personality,
                academicProjects: academicProjects
            };
            
            // Add score
            result.score = this.calculateCandidateScore(result);
            
            // Add recommendation
            result.recommendation = this.recommendProfileCategory(result);
            
            return result;
        } catch (error) {
            console.error('Error combining analyses:', error);
            throw new Error('Failed to combine analyses');
        }
    }

    // Add isValidCV method to validate CV content after extraction
    async isValidCV(text) {
        // If text is completely empty, reject
        if (!text || text.trim() === '') {
            console.log('CV text is completely empty');
            throw new Error('The uploaded file contains no text content');
        }

        // If text length is too short, check if it contains any meaningful content
        if (text.trim().length < 200) {
            console.log('CV text is very short, checking for any meaningful content');
            
            // Check if there's at least a name or basic identification info
            const hasName = /[A-Z][a-z]+ [A-Z][a-z]+/.test(text);
            const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
            const hasPhone = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);
            
            if (!hasName && !hasEmail && !hasPhone) {
                console.log('CV lacks basic identification info');
                throw new Error('The CV appears incomplete. No name, email, or phone number found.');
            }
            
            // Continue with limited data if at least basic info is present
            console.log('CV is minimal but contains basic identification - proceeding with limited data');
            return true;
        }

        // Define CV-related keywords and sections that should be present in a valid CV
        const cvKeywords = [
            'experience', 'education', 'skills', 'work', 'employment', 'job', 
            'resume', 'cv', 'career', 'professional', 'qualification', 'degree', 
            'university', 'college', 'school', 'certification', 'contact', 'email',
            'phone', 'address', 'linkedin', 'github', 'portfolio'
        ];

        // Convert text to lowercase for case-insensitive matching
        const lowerText = text.toLowerCase();
        
        // Count how many CV keywords are present in the text
        const keywordMatches = cvKeywords.filter(keyword => 
            lowerText.includes(keyword)
        ).length;
        
        // A valid CV should contain at least 3 of these keywords (reduced from 5)
        if (keywordMatches < 3) {
            console.log(`CV validation warning: Only ${keywordMatches} CV keywords found`);
            // Don't fail completely, just log a warning
        }

        // Check for common CV sections
        const cvSections = [
            /education|academic|qualification|degree|university|college|school/i,
            /experience|employment|work|job|career|position/i,
            /skills|abilities|competencies|expertise/i,
            /contact|email|phone|address|details/i
        ];

        // Count how many CV sections are present in the text
        const sectionMatches = cvSections.filter(sectionRegex => 
            sectionRegex.test(lowerText)
        ).length;

        // A valid CV should match at least 1 of these section patterns (reduced from 2)
        if (sectionMatches < 1) {
            console.log(`CV validation warning: No clear CV sections found`);
            // If we have enough text and some keywords, proceed anyway
            if (text.length > 300 && keywordMatches >= 2) {
                console.log('Proceeding with CV analysis despite lack of clear sections');
                return true;
            }
            
            throw new Error('The file does not appear to be a properly formatted CV or resume');
        }

        console.log(`CV validation passed: ${keywordMatches} keywords, ${sectionMatches} sections`);
        return true;
    }

    fallbackEducationAnalysis(cvText) {
        try {
            // Create a more comprehensive approach for education extraction
            const degreePatterns = {
                'phd': [
                    /ph\.?d\.?|doctorate|doctoral/i,
                    /doctor\s+of\s+philosophy/i
                ],
                'masters': [
                    /master(?:'?s)?|m\.(?:s|eng|ba|sc|arch|fa|ed|sci|tech)/i,
                    /ma\b|mba\b|m\.a\.?|m\.sc\.?|m\.eng\.?/i,
                    /master\s+of\s+(?:science|arts|engineering|business|technology)/i
                ],
                'bachelors': [
                    /bachelor(?:'?s)?|b\.?(?:s|a|eng|sc|arch|fa|ed)/i,
                    /ba\b|bs\b|bsc\b|b\.a\.?|b\.s\.?|b\.eng\.?/i,
                    /bachelor\s+of\s+(?:science|arts|engineering|technology)/i
                ],
                'associate': [
                    /associate(?:'?s)?|a\.?(?:s|a|aas)/i,
                    /aa\b|as\b|a\.a\.?|a\.s\.?/i,
                    /associate\s+of\s+(?:science|arts|applied\s+science)/i
                ],
                'high_school': [
                    /high\s+school|secondary\s+school|diploma/i,
                    /lycee|baccalaureat/i,
                    /lyceum|abitur|matura/i
                ]
            };

            // Extract education sections
            const educationSection = this.extractEducationSection(cvText);
            const text = educationSection || cvText;

            // Find all degree matches
            const foundDegrees = {};
            const extractedInstitutions = new Set();
            
            for (const [level, patterns] of Object.entries(degreePatterns)) {
                foundDegrees[level] = false;
                
                for (const pattern of patterns) {
                    if (pattern.test(text)) {
                        foundDegrees[level] = true;
                        break;
                    }
                }
            }
            
            // Extract institutions
            const institutionPatterns = [
                /(?:university|college|institute|school|academy)(?:\s+of\s+[\w\s]+)?/gi,
                /(?<![a-z])(?:university|college|institute|school)\b/gi,
                /(?:[A-Z][a-z]*\s+){1,3}(?:University|College|Institute|School)\b/g
            ];
            
            for (const pattern of institutionPatterns) {
                const matches = text.matchAll(pattern);
                for (const match of matches) {
                    if (match[0].length > 3) { // Avoid short matches
                        extractedInstitutions.add(match[0].trim());
                    }
                }
            }
            
            // Extract GPA if present
            let gpa = null;
            const gpaMatch = text.match(/gpa\s*:?\s*(\d+\.\d+)(?:\s*\/\s*(\d+\.\d+|\d+))?/i);
            if (gpaMatch) {
                gpa = parseFloat(gpaMatch[1]);
                // Normalize to a 4.0 scale if needed
                if (gpaMatch[2] && parseFloat(gpaMatch[2]) > 4.5) {
                    const scale = parseFloat(gpaMatch[2]);
                    gpa = (gpa / scale) * 4.0;
                }
            }

            // Determine highest education level
            let highestLevel = 'high_school';
            const levelOrder = ['high_school', 'associate', 'bachelors', 'masters', 'phd'];
            
            for (let i = levelOrder.length - 1; i >= 0; i--) {
                if (foundDegrees[levelOrder[i]]) {
                    highestLevel = levelOrder[i];
                    break;
                }
            }

            return {
                level: levelOrder.filter(level => foundDegrees[level]),
                institutions: Array.from(extractedInstitutions),
                gpa: gpa,
                confidence: 0.8,
                source: 'local'
            };
        } catch (error) {
            console.error('Error in fallbackEducationAnalysis:', error);
            return {
                level: [],
                institutions: [],
                confidence: 0.5,
                source: 'fallback'
            };
        }
    }

    extractEducationSection(text) {
        try {
            // Find education section
            const sectionPatterns = [
                /EDUCATION(?:.+?)(?=\n\s*[A-Z][A-Z\s]+:?|\Z)/is,
                /Education(?:.+?)(?=\n\s*[A-Z][a-z]+\s+[A-Z][a-z]+:?|\Z)/is,
                /Academic Background(?:.+?)(?=\n\s*[A-Z][A-Z\s]+:?|\Z)/is,
                /Educational Qualifications(?:.+?)(?=\n\s*[A-Z][A-Z\s]+:?|\Z)/is
            ];
            
            for (const pattern of sectionPatterns) {
                const match = text.match(pattern);
                if (match) {
                    return match[0];
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error extracting education section:', error);
            return null;
        }
    }

    determineProfileType(cvText, skills = []) {
        try {
            // First check for student status
            const isStudent = /\b(?:student|engineering student|it student|1st year|2nd year|3rd year|4th year|undergraduate|graduate student)\b/i.test(cvText);
            
            // First check for job titles in headers or prominent positions
            const titleMatches = this.extractJobTitle(cvText);
            
            if (titleMatches) {
                // Check for IT/CS student profiles
                if (/\b(?:IT|computer science|software|engineering|CS)\s+(?:student|undergraduate|graduate)\b/i.test(titleMatches)) {
                    return { 
                        profileType: 'developer', 
                        role: 'IT Engineering Student',
                        isStudent: true
                    };
                }
                
                // Check for engineering profiles
                if (/\b(?:mechanical|electrical|civil|software|chemical|biomedical|aerospace)\s+engineer\b/i.test(titleMatches)) {
                    return { 
                        profileType: 'engineering', 
                        role: titleMatches.match(/\b(\w+\s+engineer)\b/i)?.[1] || 'Engineer',
                        isStudent: isStudent
                    };
                }
                
                // Check for IT/software profiles
                if (/\b(?:software|web|full.?stack|backend|frontend|mobile|ios|android|java|python)\s+(?:developer|engineer|architect)\b/i.test(titleMatches)) {
                    return { 
                        profileType: 'developer', 
                        role: titleMatches.match(/\b([\w\s-]+(?:developer|engineer|architect))\b/i)?.[1] || 'Developer',
                        isStudent: isStudent
                    };
                }
                
                // Check for data science profiles
                if (/\b(?:data\s+scientist|data\s+analyst|machine\s+learning|ai\s+engineer|data\s+engineer)\b/i.test(titleMatches)) {
                    return { 
                        profileType: 'data', 
                        role: titleMatches.match(/\b([\w\s]+(?:scientist|analyst|engineer))\b/i)?.[1] || 'Data Scientist',
                        isStudent: isStudent
                    };
                }
                
                // Check for design profiles
                if (/\b(?:ux|ui|graphic|web|product)\s+design/i.test(titleMatches)) {
                    return { 
                        profileType: 'designer', 
                        role: titleMatches.match(/\b([\w\s]+design(?:er)?)\b/i)?.[1] || 'Designer',
                        isStudent: isStudent
                    };
                }
                
                // Check for marketing profiles
                if (/\b(?:marketing|seo|content|social\s+media|digital\s+marketing|brand)\s+(?:specialist|manager|coordinator)\b/i.test(titleMatches)) {
                    return { 
                        profileType: 'marketing', 
                        role: titleMatches.match(/\b([\w\s]+(?:specialist|manager|coordinator))\b/i)?.[1] || 'Marketing Specialist',
                        isStudent: isStudent
                    };
                }
                
                // Check for sales profiles
                if (/\b(?:sales|account|business\s+development|customer\s+success)\s+(?:representative|manager|executive)\b/i.test(titleMatches)) {
                    return { 
                        profileType: 'sales', 
                        role: titleMatches.match(/\b([\w\s]+(?:representative|manager|executive))\b/i)?.[1] || 'Sales Representative',
                        isStudent: isStudent
                    };
                }
                
                // Return the extracted title if it doesn't match specific categories
                return {
                    profileType: 'professional',
                    role: titleMatches,
                    isStudent: isStudent
                };
            }
            
            // Check for common student indicators
            if (isStudent) {
                // Check for IT/CS student indicators
                if (/\b(?:programming|coding|software|development|web|app|IT|computer science|CS)\b/i.test(cvText)) {
                    return {
                        profileType: 'developer',
                        role: 'IT Student',
                        isStudent: true
                    };
                }
                
                // Check for engineering student indicators
                if (/\b(?:engineering|mechanical|electrical|civil)\b/i.test(cvText)) {
                    return {
                        profileType: 'engineering',
                        role: 'Engineering Student',
                        isStudent: true
                    };
                }
            }
            
            // Fallback to skill-based detection
            const skillCategories = {
                'engineering': [
                    'mechanical', 'electrical', 'civil', 'chemical', 'industrial', 'CAD', 
                    'simulation', 'FEA', 'CFD', 'thermodynamics', 'GD&T', 'manufacturing'
                ],
                'developer': [
                    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'React', 'Angular', 'Node.js',
                    'web development', 'software development', 'coding', 'programming',
                    'HTML', 'CSS', 'PHP', 'SQL', 'Git', 'MySQL', 'Oracle DB', 'Linux', 'Unix'
                ],
                'data': [
                    'data analysis', 'machine learning', 'artificial intelligence', 'statistics',
                    'pandas', 'TensorFlow', 'PyTorch', 'SQL', 'data visualization', 'big data'
                ],
                'designer': [
                    'UI', 'UX', 'graphic design', 'Adobe', 'Figma', 'Sketch', 'wireframing',
                    'design thinking', 'typography', 'visual design', 'illustration'
                ],
                'marketing': [
                    'digital marketing', 'content marketing', 'SEO', 'SEM', 'social media',
                    'campaign management', 'Google Analytics', 'content strategy', 'branding'
                ],
                'sales': [
                    'sales', 'account management', 'business development', 'client relations',
                    'negotiation', 'CRM', 'lead generation', 'customer acquisition'
                ]
            };
            
            // Count matches for each category
            const scores = {};
            for (const [category, keywords] of Object.entries(skillCategories)) {
                scores[category] = 0;
                
                // Check CV text for category keywords
                for (const keyword of keywords) {
                    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                    if (regex.test(cvText)) {
                        scores[category]++;
                    }
                }
                
                // Check extracted skills
                for (const skill of skills) {
                    for (const keyword of keywords) {
                        if (typeof skill === 'string' && skill.toLowerCase().includes(keyword.toLowerCase())) {
                            scores[category]++;
                            break;
                        } else if (skill.name && skill.name.toLowerCase().includes(keyword.toLowerCase())) {
                            scores[category]++;
                            break;
                        }
                    }
                }
            }
            
            // Find the category with the highest score
            let maxScore = 0;
            let maxCategory = 'professional';
            
            for (const [category, score] of Object.entries(scores)) {
                if (score > maxScore) {
                    maxScore = score;
                    maxCategory = category;
                }
            }
            
            // Determine specific role based on highest scoring category
            let role = this.determineSpecificRole(cvText, skills, maxCategory);
            
            // If student indicators were found, adjust the role
            if (isStudent) {
                role = role.includes('Student') ? role : (role + ' Student');
            }
            
            return {
                profileType: maxCategory,
                role: role,
                isStudent: isStudent
            };
        } catch (error) {
            console.error('Error determining profile type:', error);
            return {
                profileType: 'professional',
                role: 'Professional',
                isStudent: false
            };
        }
    }
    
    extractJobTitle(cvText) {
        try {
            // Look for job title patterns in the CV
            const titlePatterns = [
                // Look for a title centered or prominent at the top of the CV
                /^\s*(.{3,50}?)(?=\n)/i,
                // Look for a title next to a name
                /(?:^|\n)(?:[A-Z][a-z]+\s+){1,3}[A-Z][a-z]+\s+(?:[-–|]\s+)?([\w\s]+)/i,
                // Look for "Position: X" or "Title: X" patterns
                /(?:position|title|role|designation):\s*([\w\s-]+)(?=$|\n)/i,
                // Look for a title in all caps
                /\b([A-Z][A-Z\s]{3,30})\b/
            ];
            
            for (const pattern of titlePatterns) {
                const match = cvText.match(pattern);
                if (match && match[1] && match[1].trim().length > 0) {
                    // Filter out non-title matches
                    const title = match[1].trim();
                    if (!/(?:name|address|phone|email|resume|cv|\d{4}|\bthe\b|\band\b)/i.test(title)) {
                        return title;
                    }
                }
            }
            
            // Look for potential job titles in the text
            const commonTitles = [
                "Engineer", "Developer", "Architect", "Manager", "Director", "Specialist",
                "Analyst", "Consultant", "Designer", "Administrator", "Coordinator"
            ];
            
            for (const title of commonTitles) {
                const regex = new RegExp(`\\b([A-Za-z]+(?:\\s+[A-Za-z]+){0,2}\\s+${title})\\b`, 'i');
                const match = cvText.match(regex);
                if (match && match[1]) {
                    return match[1];
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error extracting job title:', error);
            return null;
        }
    }
    
    determineSpecificRole(cvText, skills, category) {
        try {
            // Determine specific roles based on category
            switch (category) {
                case 'engineering':
                    // Check for specific engineering disciplines
                    if (/\bmechanical\b/i.test(cvText)) return 'Mechanical Engineer';
                    if (/\belectrical\b/i.test(cvText)) return 'Electrical Engineer';
                    if (/\bcivil\b/i.test(cvText)) return 'Civil Engineer';
                    if (/\bsoftware\b/i.test(cvText)) return 'Software Engineer';
                    if (/\bchemical\b/i.test(cvText)) return 'Chemical Engineer';
                    if (/\bindustrial\b/i.test(cvText)) return 'Industrial Engineer';
                    return 'Engineer';
                
                case 'developer':
                    // Check for specific developer roles
                    if (/\bfull.?stack\b/i.test(cvText)) return 'Full-Stack Developer';
                    if (/\bfront.?end\b/i.test(cvText)) return 'Frontend Developer';
                    if (/\bback.?end\b/i.test(cvText)) return 'Backend Developer';
                    if (/\bmobile\b/i.test(cvText)) return 'Mobile Developer';
                    if (/\bios\b/i.test(cvText)) return 'iOS Developer';
                    if (/\bandroid\b/i.test(cvText)) return 'Android Developer';
                    if (/\bweb\b/i.test(cvText)) return 'Web Developer';
                    if (/\bjavascript\b/i.test(cvText)) return 'JavaScript Developer';
                    if (/\bpython\b/i.test(cvText)) return 'Python Developer';
                    if (/\bjava\b/i.test(cvText)) return 'Java Developer';
                    return 'Software Developer';
                
                case 'data':
                    if (/\bdata\s+scientist\b/i.test(cvText)) return 'Data Scientist';
                    if (/\bdata\s+analyst\b/i.test(cvText)) return 'Data Analyst';
                    if (/\bmachine\s+learning\b/i.test(cvText)) return 'Machine Learning Engineer';
                    if (/\bdata\s+engineer\b/i.test(cvText)) return 'Data Engineer';
                    return 'Data Scientist';
                
                case 'designer':
                    if (/\bux\b/i.test(cvText)) return 'UX Designer';
                    if (/\bui\b/i.test(cvText)) return 'UI Designer';
                    if (/\bgraphic\b/i.test(cvText)) return 'Graphic Designer';
                    if (/\bweb\b/i.test(cvText)) return 'Web Designer';
                    if (/\bproduct\b/i.test(cvText)) return 'Product Designer';
                    return 'Designer';
                
                case 'marketing':
                    if (/\bdigital\s+marketing\b/i.test(cvText)) return 'Digital Marketing Specialist';
                    if (/\bcontent\b/i.test(cvText)) return 'Content Marketing Specialist';
                    if (/\bseo\b/i.test(cvText)) return 'SEO Specialist';
                    if (/\bsocial\s+media\b/i.test(cvText)) return 'Social Media Specialist';
                    if (/\bbrand\b/i.test(cvText)) return 'Brand Marketing Specialist';
                    if (/\bmarketing\s+manager\b/i.test(cvText)) return 'Marketing Manager';
                    return 'Marketing Specialist';
                
                case 'sales':
                    if (/\baccount\s+executive\b/i.test(cvText)) return 'Account Executive';
                    if (/\bbusiness\s+development\b/i.test(cvText)) return 'Business Development Representative';
                    if (/\bsales\s+manager\b/i.test(cvText)) return 'Sales Manager';
                    if (/\bcustomer\s+success\b/i.test(cvText)) return 'Customer Success Manager';
                    return 'Sales Representative';
                
                default:
                    return 'Professional';
            }
        } catch (error) {
            console.error('Error determining specific role:', error);
            return 'Professional';
        }
    }

    extractDates(text) {
        try {
            const datePatterns = [
                /\b(19|20)\d{2}\b/g,  // Years like 1990, 2020
                /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/gi,  // Month Year
                /\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/gi
            ];
            
            const dates = new Set();
            
            for (const pattern of datePatterns) {
                const matches = text.matchAll(pattern);
                for (const match of matches) {
                    dates.add(match[0]);
                }
            }
            
            return Array.from(dates);
        } catch (error) {
            console.error('Error extracting dates:', error);
            return [];
        }
    }

    extractOrganizations(text) {
        try {
            const orgPatterns = [
                /(?<=\n|^|\.\s+)([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)+)(?=\n|$|\.)/g,  // Capitalized multi-word names
                /\b(?:at|for|with)\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)+)/g,  // "at/for/with Company Name"
                /\b(?:University|College|Institute|School) of [A-Z][A-Za-z]+\b/g,  // Universities
                /\b[A-Z][A-Za-z]+ (?:University|College|Institute|School)\b/g,  // Universities
                /\b(?:Inc\.|LLC|Ltd\.|Corp\.|Corporation)\b/g  // Company suffixes
            ];
            
            const organizations = new Set();
            
            for (const pattern of orgPatterns) {
                const matches = text.matchAll(pattern);
                for (const match of matches) {
                    const org = match[1] || match[0];
                    // Filter out common non-organization capitalized phrases
                    if (!this.isCommonPhrase(org) && org.length > 3) {
                        organizations.add(org.trim());
                    }
                }
            }
            
            return Array.from(organizations);
        } catch (error) {
            console.error('Error extracting organizations:', error);
            return [];
        }
    }

    isCommonPhrase(text) {
        const commonPhrases = [
            'I', 'me', 'my', 'mine', 'we', 'our', 'us', 'you', 'your', 'yours',
            'the', 'this', 'that', 'those', 'these', 'it', 'its', 'they', 'them',
            'and', 'or', 'but', 'for', 'with', 'without', 'about', 'to', 'from',
            'in', 'on', 'at', 'by', 'as', 'of', 'am', 'is', 'are', 'was', 'were',
            'has', 'have', 'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would',
            'shall', 'should', 'may', 'might', 'must', 'email', 'phone', 'name', 'address',
            'city', 'state', 'zip', 'country', 'date', 'year', 'month', 'day',
            'resume', 'cv', 'curriculum', 'vitae', 'contact', 'info', 'information',
            'profile', 'summary', 'title', 'job', 'career', 'experience', 'education'
        ];
        
        return commonPhrases.includes(text.toLowerCase());
    }

    extractLocations(text) {
        try {
            // Common city/country patterns
            const locationPatterns = [
                /\b[A-Z][a-z]+, [A-Z]{2}\b/g,  // City, ST format
                /\b[A-Z][a-z]+, [A-Z][a-z]+\b/g,  // City, State format
                /\b[A-Z][a-z]+ [A-Z][a-z]+, [A-Z]{2}\b/g,  // Two-word City, ST
                /\b(?:New York|Los Angeles|San Francisco|San Diego|Las Vegas|New Orleans|Hong Kong|New Delhi|Tel Aviv|St. Louis)\b/g  // Multi-word cities
            ];
            
            const locations = new Set();
            
            for (const pattern of locationPatterns) {
                const matches = text.matchAll(pattern);
                for (const match of matches) {
                    locations.add(match[0]);
                }
            }
            
            return Array.from(locations);
        } catch (error) {
            console.error('Error extracting locations:', error);
            return [];
        }
    }

    generateMinimumViableResult() {
        return {
            summary: 'Profile summary not available.',
            profileType: 'professional',
            keySkills: [],
            technicalProficiency: {
                programming: [],
                frameworks: [],
                databases: [],
                tools: [],
                professional: []
            },
            role: {
                primaryRole: 'Professional',
                confidence: 0.5,
                profileType: 'professional',
                capabilities: [],
                role: ['Professional']
            },
            experience: {
                years: 0,
                organizations: [],
                locations: []
            },
            education: {
                level: [],
                institutions: [],
                confidence: 0.5,
                source: 'local'
            },
            personality: {
                traits: {},
                confidence: 0.5,
                source: 'local'
            },
            entities: {
                organizations: [],
                dates: [],
                locations: []
            },
            score: {
                total: 0,
                breakdown: {
                    keySkillsScore: 0,
                    roleScore: 0,
                    toolsScore: 0,
                    experienceScore: 0,
                    educationScore: 0,
                    softSkillsScore: 0,
                    summaryScore: 0,
                    orgScore: 0
                }
            },
            recommendation: 'Professional'
        };
    }

    extractSkillsSection(cvText) {
        try {
            // Fix the invalid regex pattern and improve skill section detection
            const skillPatterns = [
                /\b(?:skills|competencies|expertise|proficiencies?)\s*:?\s*([^.]*)/i,
                /\b(?:technical|professional|core)\s+(?:skills|competencies)\s*:?\s*([^.]*)/i,
                /\b(?:programming|software|development)\s+(?:languages?|skills?)\s*:?\s*([^.]*)/i
            ];

            let skillsSection = '';
            for (const pattern of skillPatterns) {
                const match = cvText.match(pattern);
                    if (match && match[1]) {
                    skillsSection = match[1];
                    break;
                }
            }

            if (!skillsSection) {
                // Fallback: Look for bullet points or lists that might contain skills
                const bulletPoints = cvText.split(/[•\-\*]/).filter(point => 
                    point.length > 10 && 
                    !point.toLowerCase().includes('experience') &&
                    !point.toLowerCase().includes('education')
                );
                if (bulletPoints.length > 0) {
                    skillsSection = bulletPoints.join(', ');
                }
            }

            return skillsSection;
        } catch (error) {
            console.error('Error in extractSkillsSection:', error);
            return '';
        }
    }

    organizeSkillsByCategory(skills) {
        try {
            // Define skill categories
            const categories = {
                programming: [
                    'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'typescript',
                    'swift', 'kotlin', 'go', 'rust', 'perl', 'scala', 'r'
                ],
                frameworks: [
                    'react', 'angular', 'vue', 'node', 'express', 'django', 'spring', 'laravel',
                    'flask', 'bootstrap', 'jquery', 'nextjs', 'gatsby', 'symfony'
                ],
                databases: [
                    'sql', 'mysql', 'postgresql', 'mongodb', 'oracle', 'redis', 'cassandra',
                    'dynamodb', 'firebase', 'neo4j', 'sqlite', 'mariadb'
                ],
                tools: [
                    'git', 'docker', 'kubernetes', 'jenkins', 'aws', 'azure', 'gcp', 'terraform',
                    'ansible', 'jira', 'confluence', 'github', 'gitlab', 'bitbucket'
                ],
                design: [
                    'ui', 'ux', 'photoshop', 'illustrator', 'figma', 'sketch', 'indesign',
                    'xd', 'wireframing', 'prototyping'
                ],
                engineering: [
                    'cad', 'solidworks', 'autocad', 'simulation', 'fea', 'manufacturing',
                    'mechanical', 'electrical', 'civil', 'chemical', 'industrial'
                ],
                marketing: [
                    'seo', 'sem', 'google analytics', 'social media', 'content marketing',
                    'email marketing', 'advertising', 'branding', 'market research'
                ],
                professional: [
                    'leadership', 'communication', 'teamwork', 'problem solving', 'time management',
                    'project management', 'critical thinking', 'adaptability'
                ]
            };
            
            // Initialize result
            const result = [];
            
            // Categorize skills
            for (const [category, keywords] of Object.entries(categories)) {
                const categorySkills = [];
                
                for (const skill of skills) {
                    const skillLower = skill.toLowerCase();
                    
                    if (keywords.some(keyword => 
                        skillLower.includes(keyword) || 
                        keyword.includes(skillLower)
                    )) {
                        categorySkills.push({
                            name: skill,
                            confidence: 0.8
                        });
                    }
                }
                
                if (categorySkills.length > 0) {
                    result.push({
                        type: category,
                        skills: categorySkills
                    });
                }
            }
            
            // Add uncategorized skills
            const categorizedSkillNames = new Set(
                result.flatMap(category => 
                    category.skills.map(skill => skill.name.toLowerCase())
                )
            );
            
            const uncategorizedSkills = skills
                .filter(skill => !categorizedSkillNames.has(skill.toLowerCase()))
                .map(skill => ({
                    name: skill,
                    confidence: 0.7
                }));
            
            if (uncategorizedSkills.length > 0) {
                result.push({
                    type: 'other',
                    skills: uncategorizedSkills
                });
            }
            
            return result;
        } catch (error) {
            console.error('Error organizing skills by category:', error);
            return [];
        }
    }

    convertSkillSetsToTechnicalProficiency(skillSets) {
        try {
            const result = {
                programming: [],
                frameworks: [],
                databases: [],
                tools: [],
                professional: [],
                design: [],
                engineering: [],
                marketing: [],
                other: []
            };
            
            for (const category of skillSets) {
                const type = category.type.toLowerCase();
                if (result.hasOwnProperty(type)) {
                    result[type] = category.skills.map(skill => skill.name);
                } else {
                    result.other = [...result.other, ...category.skills.map(skill => skill.name)];
                }
            }
            
            return result;
        } catch (error) {
            console.error('Error converting skill sets to technical proficiency:', error);
            return {
                programming: [],
                frameworks: [],
                databases: [],
                tools: [],
                professional: []
            };
        }
    }

    generateBasicPersonalityTraits(text) {
        try {
            // Define common personality traits to look for
            const traitPatterns = {
                'leadership': /\b(?:lead|leader|leadership|manage|direct|guide|mentor)\b/i,
                'teamwork': /\b(?:team|collaborate|cooperation|collaborative|group)\b/i,
                'communication': /\b(?:communicat|present|articulate|express|speak|write)\b/i,
                'analytical': /\b(?:analy|research|solve|critical|thinking|problem|data-driven)\b/i,
                'detail-oriented': /\b(?:detail|meticulous|thorough|precise|accurate|attentive)\b/i,
                'adaptability': /\b(?:adapt|flexible|versatile|adjust|dynamic|agile)\b/i,
                'creativity': /\b(?:creat|innovat|design|original|imaginative)\b/i,
                'proactive': /\b(?:proactive|initiative|self-starter|driven|motivated)\b/i
            };
            
            // Check for each trait in the text
            const traits = [];
            for (const [trait, pattern] of Object.entries(traitPatterns)) {
                if (pattern.test(text)) {
                    traits.push({
                        name: trait,
                        confidence: 0.7
                    });
                }
            }
            
            // If no traits were found, add some default ones based on CV content
            if (traits.length === 0) {
                // Check for education-related keywords
                if (/\b(?:degree|university|college|education|graduate|academic)\b/i.test(text)) {
                    traits.push({ name: 'analytical', confidence: 0.6 });
                }
                
                // Check for experience-related keywords
                if (/\b(?:experience|work|job|career|professional)\b/i.test(text)) {
                    traits.push({ name: 'adaptability', confidence: 0.6 });
                }
                
                // Add communication as a default trait for most CVs
                traits.push({ name: 'communication', confidence: 0.5 });
            }
            
            return traits;
        } catch (error) {
            console.error('Error generating basic personality traits:', error);
            return [
                { name: 'communication', confidence: 0.5 },
                { name: 'adaptability', confidence: 0.5 }
            ];
        }
    }

    extractSectionContent(sections, label) {
        const relevantSections = sections.filter(section => 
            section.toLowerCase().includes(label.toLowerCase())
        );
        return relevantSections.join('\n\n');
    }
}

export default new CVAnalysisService(); 