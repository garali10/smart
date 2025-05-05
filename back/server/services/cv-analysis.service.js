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
            this.hf = new HfInference("");
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
            const cvIndicators = ['experience', 'education', 'skills', 'work'];
            const hasIndicators = cvIndicators.some(indicator => lowerText.includes(indicator));
            
            if (!hasIndicators) {
                console.warn('Text does not appear to contain basic CV indicators');
                throw new Error('The provided text does not appear to be a CV or resume.');
            }
            
            const sanitizedText = this.sanitizeText(cvText);
            console.log('Starting AI-powered CV analysis...');

            const [
                summaryAnalysis,
                skillsAnalysis,
                roleAnalysis,
                personalityAnalysis,
                entitiesAnalysis
            ] = await Promise.all([
                this.analyzeSummary(sanitizedText),
                this.analyzeSkills(sanitizedText),
                this.analyzeRole(sanitizedText),
                this.analyzePersonality(sanitizedText),
                this.analyzeEntities(sanitizedText)
            ]);

            return this.combineAnalyses({
                summary: summaryAnalysis,
                skills: skillsAnalysis,
                role: roleAnalysis,
                personality: personalityAnalysis,
                entities: entitiesAnalysis
            });
        } catch (error) {
            console.error('Error in CV analysis:', error);
            throw new Error('CV analysis failed: ' + error.message);
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

    async analyzeSkills(text) {
        try {
            // First, determine the profile type
            const profileType = await this.determineProfileType(text);
            console.log('Detected profile type:', profileType);
            let skillSets = [];
            
            // Extract skills from a 'Skills' section if present
            const extractedSkills = this.extractSkillsSection(text);
            if (extractedSkills.length > 0) {
                skillSets.push({ type: 'extracted', skills: extractedSkills.map(s => ({ name: s, confidence: 1 })) });
            }
            
            try {
                // Marketing Skills
                if (profileType.type.includes('marketing')) {
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
                if (profileType.type.includes('sales')) {
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
                if (profileType.type.includes('developer')) {
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
                
                // Web Designer Skills
                if (profileType.type.includes('designer')) {
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
                
                // Fallback to extract skills from CV text using keyword matching
                skillSets = this.fallbackSkillExtraction(text, profileType.type);
            }
            
            return {
                profileType: profileType.type,
                skillSets
            };
        } catch (error) {
            console.warn('Skills analysis failed:', error);
            // Provide fallback skills to ensure the analysis continues
            return { 
                profileType: 'general',
                skillSets: this.fallbackSkillExtraction(text, 'general')
            };
        }
    }
    
    fallbackSkillExtraction(text, profileType) {
        const skillSets = [];
        const lowerText = text.toLowerCase();
        
        // Extract basic skills from the text based on common terms
        const extractedSkills = this.extractSkillsSection(text);
        if (extractedSkills.length > 0) {
            skillSets.push({ 
                type: 'extracted', 
                skills: extractedSkills.map(s => ({ name: s, confidence: 1 })) 
            });
        }
        
        // Add profile-specific skills based on keyword matching
        if (profileType.includes('marketing')) {
            const marketingKeywords = [
                'digital marketing', 'content marketing', 'social media marketing', 'SEO', 
                'email marketing', 'brand management', 'market research', 'marketing analytics',
                'campaign management', 'marketing strategy'
            ];
            
            const matchedSkills = marketingKeywords
                .filter(keyword => lowerText.includes(keyword.toLowerCase()))
                .map(skill => ({ name: skill, confidence: 0.8 }));
                
            // Add some default skills if none matched
            if (matchedSkills.length === 0) {
                matchedSkills.push(
                    { name: 'marketing', confidence: 0.7 },
                    { name: 'communication', confidence: 0.7 },
                    { name: 'social media', confidence: 0.6 }
                );
            }
            
            skillSets.push({ type: 'marketing', skills: matchedSkills });
        }
        
        if (profileType.includes('sales')) {
            const salesKeywords = [
                'lead generation', 'negotiation', 'closing deals', 'prospecting', 'account management',
                'pipeline management', 'CRM', 'customer relationship', 'territory management', 'quota attainment'
            ];
            
            const matchedSkills = salesKeywords
                .filter(keyword => lowerText.includes(keyword.toLowerCase()))
                .map(skill => ({ name: skill, confidence: 0.8 }));
                
            // Add some default skills if none matched
            if (matchedSkills.length === 0) {
                matchedSkills.push(
                    { name: 'sales', confidence: 0.7 },
                    { name: 'negotiation', confidence: 0.7 },
                    { name: 'customer relationship', confidence: 0.6 }
                );
            }
            
            skillSets.push({ type: 'sales', skills: matchedSkills });
        }
        
        if (profileType.includes('developer')) {
            const programmingKeywords = [
                'JavaScript', 'Python', 'Java', 'C++', 'PHP', 'Ruby', 'TypeScript', 'C#', 'Swift', 'Go'
            ];
            
            const frameworkKeywords = [
                'React', 'Angular', 'Vue.js', 'Node.js', 'Django', 'Spring', 'Laravel', 'Express.js', 'ASP.NET', 'Flask'
            ];
            
            const matchedProgramming = programmingKeywords
                .filter(keyword => lowerText.includes(keyword.toLowerCase()))
                .map(skill => ({ name: skill, confidence: 0.8 }));
                
            const matchedFrameworks = frameworkKeywords
                .filter(keyword => lowerText.includes(keyword.toLowerCase()))
                .map(skill => ({ name: skill, confidence: 0.8 }));
                
            // Add some default skills if none matched
            if (matchedProgramming.length === 0) {
                matchedProgramming.push(
                    { name: 'JavaScript', confidence: 0.6 },
                    { name: 'HTML/CSS', confidence: 0.6 }
                );
            }
            
            skillSets.push(
                { type: 'programming', skills: matchedProgramming },
                { type: 'frameworks', skills: matchedFrameworks }
            );
        }
        
        if (profileType.includes('designer')) {
            const designKeywords = [
                'UI Design', 'UX Design', 'Responsive Design', 'Web Design', 'Adobe XD',
                'Figma', 'Sketch', 'Adobe Photoshop', 'Adobe Illustrator', 'Wireframing'
            ];
            
            const matchedSkills = designKeywords
                .filter(keyword => lowerText.includes(keyword.toLowerCase()))
                .map(skill => ({ name: skill, confidence: 0.8 }));
                
            // Add some default skills if none matched
            if (matchedSkills.length === 0) {
                matchedSkills.push(
                    { name: 'Design', confidence: 0.7 },
                    { name: 'Creative', confidence: 0.7 },
                    { name: 'Visual Communication', confidence: 0.6 }
                );
            }
            
            skillSets.push({ type: 'design', skills: matchedSkills });
        }
        
        // Add general professional skills
        const professionalKeywords = [
            'project management', 'team leadership', 'problem solving', 'communication',
            'time management', 'collaboration', 'analytical thinking', 'attention to detail',
            'creativity', 'adaptability'
        ];
        
        const matchedProfessional = professionalKeywords
            .filter(keyword => lowerText.includes(keyword.toLowerCase()))
            .map(skill => ({ name: skill, confidence: 0.8 }));
            
        // Add some default professional skills if none matched
        if (matchedProfessional.length === 0) {
            matchedProfessional.push(
                { name: 'communication', confidence: 0.7 },
                { name: 'team work', confidence: 0.7 },
                { name: 'problem solving', confidence: 0.6 }
            );
        }
        
        skillSets.push({ type: 'professional', skills: matchedProfessional });
        
        // Add general tools
        const toolsKeywords = [
            'Git', 'JIRA', 'AWS', 'Docker', 'Google Analytics', 'Microsoft Office',
            'Slack', 'Adobe Creative Suite', 'Visual Studio Code', 'WordPress'
        ];
        
        const matchedTools = toolsKeywords
            .filter(keyword => lowerText.includes(keyword.toLowerCase()))
            .map(skill => ({ name: skill, confidence: 0.8 }));
            
        // Add Microsoft Office by default if no tools matched
        if (matchedTools.length === 0) {
            matchedTools.push({ name: 'Microsoft Office', confidence: 0.6 });
        }
        
        skillSets.push({ type: 'tools', skills: matchedTools });
        
        return skillSets;
    }

    async determineProfileType(text) {
        try {
            const normalizedText = text.toLowerCase();
            const headerTitle = this.extractHeaderJobTitle(text).toLowerCase();
            // Strong signal from header
            if (headerTitle.includes('developer') || headerTitle.includes('engineer')) return { type: 'developer', counts: { developer: 1 }, primary: 'developer' };
            if (headerTitle.includes('designer')) return { type: 'designer', counts: { designer: 1 }, primary: 'designer' };
            if (headerTitle.includes('sales')) return { type: 'sales', counts: { sales: 1 }, primary: 'sales' };
            if (headerTitle.includes('marketing')) return { type: 'marketing', counts: { marketing: 1 }, primary: 'marketing' };
            
            // Check for sales representative and similar roles directly (common for sales profiles)
            if (normalizedText.includes('sales representative') || 
                normalizedText.includes('account manager') || 
                normalizedText.includes('business development') ||
                normalizedText.includes('sales manager')) {
                return { type: 'sales', counts: { sales: 5 }, primary: 'sales' };
            }
            
            // Check for marketing specific roles
            if (normalizedText.includes('marketing manager') || 
                normalizedText.includes('digital marketing') || 
                normalizedText.includes('marketing specialist') ||
                normalizedText.includes('marketing coordinator') ||
                normalizedText.includes('brand manager')) {
                return { type: 'marketing', counts: { marketing: 5 }, primary: 'marketing' };
            }
            
            // Check for designer specific roles
            if (normalizedText.includes('ui designer') || 
                normalizedText.includes('ux designer') || 
                normalizedText.includes('graphic designer') ||
                normalizedText.includes('web designer') ||
                normalizedText.includes('creative designer')) {
                return { type: 'designer', counts: { designer: 5 }, primary: 'designer' };
            }
            
            // Keyword lists
            const marketingTerms = [
                'marketing', 'digital marketing', 'social media', 'advertising', 'brand', 'seo',
                'content marketing', 'campaign', 'market research', 'public relations', 'pr',
                'content strategy', 'email marketing', 'google analytics', 'crm', 'hubspot',
                'mailchimp', 'campaign management', 'analytics', 'market analysis', 'customer acquisition',
                'marketing manager', 'marketing specialist', 'marketing coordinator', 'marketing analyst'
            ];
            const technicalTerms = [
                'developer', 'developpeur', 'engineer', 'software', 'programming', 'coding', 'c\+\+', 'java', 'python', 'javascript', 'php', 'git', 'qt', 'linux', 'mysql', 'css', 'html', 'arduino', 'symfony', 'flutter', 'framework', 'api', 'backend', 'frontend', 'fullstack'
            ];
            const designTerms = [
                'design', 'graphic', 'ui', 'ux', 'user interface', 'user experience',
                'photoshop', 'illustrator', 'figma', 'sketch', 'adobe',
                'visual design', 'product design', 'interaction design', 'creative'
            ];
            const salesTerms = [
                'sales', 'business development', 'account executive', 'account manager', 'lead generation',
                'crm', 'pipeline', 'quota', 'salesforce', 'negotiation', 'closing', 'prospecting',
                'b2b', 'b2c', 'client acquisition', 'customer relationship', 'territory management',
                'sales representative', 'inside sales', 'outside sales', 'sales associate'
            ];
            const businessTerms = [
                'business', 'management', 'operations', 'strategy', 'finance', 'sales', 
                'business development', 'account management', 'project management', 'mba',
                'business administration', 'leadership', 'team management', 'strategic planning',
                'customer success', 'client relations', 'negotiation', 'business strategy'
            ];
            // Count occurrences
            const countOccurrences = (terms) => {
                return terms.reduce((count, term) => {
                    const regex = new RegExp('\\b' + term + '\\b', 'gi'); // Use word boundaries for more accurate matching
                    const matches = normalizedText.match(regex);
                    return count + (matches ? matches.length : 0);
                }, 0);
            };
            const marketingCount = countOccurrences(marketingTerms);
            const technicalCount = countOccurrences(technicalTerms);
            const designCount = countOccurrences(designTerms);
            const salesCount = countOccurrences(salesTerms);
            const businessCount = countOccurrences(businessTerms);
            // Find the highest count
            const counts = {
                marketing: marketingCount,
                developer: technicalCount,
                designer: designCount,
                sales: salesCount,
                business: businessCount
            };
            
            console.log('Profile type counts:', counts);
            
            // Find the top two categories
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const [topType, topCount] = sorted[0];
            const [secondType, secondCount] = sorted[1];
            
            // If the top count is significantly higher, use that profile
            if (topCount >= 2 && topCount > secondCount * 1.5) {
                return { type: topType, counts, primary: topType };
            }
            
            // If sales and business are close together, prefer sales for more specific analysis
            if ((topType === 'sales' && secondType === 'business') || 
                (topType === 'business' && secondType === 'sales')) {
                if (salesCount >= 2) {
                    return { type: 'sales', counts, primary: 'sales' };
                }
            }
            
            // If the resume contains "sales representative", prioritize sales profile
            if (normalizedText.includes('sales representative') && salesCount > 0) {
                return { type: 'sales', counts, primary: 'sales' };
            }
            
            // Only assign if the top is at least 2 more than the next
            if (topCount >= 2 && topCount - secondCount >= 2) {
                return { type: topType, counts, primary: topType };
            }
            
            // Fallback: if technical and marketing are close, but technical has more, pick developer
            if (technicalCount > marketingCount) {
                return { type: 'developer', counts, primary: 'developer' };
            }
            
            // Otherwise, fallback to general
            return { type: 'general', counts, primary: 'general' };
        } catch (error) {
            console.warn('Profile type detection failed:', error);
            return { type: 'general', counts: {}, primary: 'general' };
        }
    }

    extractSkillsSection(text) {
        // Try to extract a 'Skills' section from the CV text
        const skillsSectionRegex = /skills\s*[:\-\n]+([\s\S]*?)(?:\n\s*\n|education|work experience|profile|$)/i;
        const match = text.match(skillsSectionRegex);
        if (match && match[1]) {
            // Split by commas or newlines, trim, and filter out empty
            return match[1].split(/,|\n|•|\*/).map(s => s.trim()).filter(Boolean);
        }
        return [];
    }

    extractHeaderJobTitle(text) {
        // Try to extract a job title from the header (first 10 lines)
        const lines = text.split(/\n|\r/).slice(0, 10).map(l => l.trim()).filter(Boolean);
        // Look for lines with common titles
        const titleKeywords = ['manager', 'developer', 'designer', 'sales', 'marketing', 'engineer', 'specialist', 'coordinator', 'analyst'];
        for (const line of lines) {
            for (const keyword of titleKeywords) {
                if (line.toLowerCase().includes(keyword)) {
                    return line;
                }
            }
        }
        return '';
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

        try {
            // First try AI analysis
            const aiAnalysis = await this.analyzeExperience(text);
            
            // Method 1: Direct year mention pattern
            const directYearPattern = /(\d+)[\s-]*(?:year|yr)s?(?:\s+of\s+)?experience/gi;
            const directMatches = Array.from(text.matchAll(directYearPattern));
            if (directMatches.length > 0) {
                const years = directMatches.map(match => parseInt(match[1]));
                return Math.max(...years);
            }

            // Method 2: Date analysis from AI-extracted dates
            if (aiAnalysis.dates.length > 0) {
                const yearPattern = /\b(19|20)\d{2}\b/g;
                const allDates = aiAnalysis.dates.join(' ');
                const years = Array.from(allDates.matchAll(yearPattern))
                    .map(match => parseInt(match[0]))
                    .sort();

                if (years.length >= 2) {
                    const earliestYear = years[0];
                    const latestYear = years[years.length - 1];
                    yearsOfExperience = Math.max(0, latestYear - earliestYear);
                }
            }

            // Method 3: Experience duration patterns
            let totalExperience = 0;

            // Pattern for "2020 - Present" or "2020 - Current"
            const presentPattern = /(\d{4})\s*-\s*(present|current|now)/gi;
            const presentMatches = Array.from(text.matchAll(presentPattern));
            for (const match of presentMatches) {
                const startYear = parseInt(match[1]);
                const currentYear = new Date().getFullYear();
                totalExperience += currentYear - startYear;
            }

            // Pattern for "2018-2020" or "2018 to 2020"
            const rangePattern = /(\d{4})\s*(?:-|to)\s*(\d{4})/g;
            const rangeMatches = Array.from(text.matchAll(rangePattern));
            for (const match of rangeMatches) {
                const startYear = parseInt(match[1]);
                const endYear = parseInt(match[2]);
                if (endYear > startYear) {
                    totalExperience += endYear - startYear;
                }
            }

            // Pattern for "Since 2019" or "From 2019"
            const sincePattern = /(?:since|from)\s*(\d{4})/gi;
            const sinceMatches = Array.from(text.matchAll(sincePattern));
            for (const match of sinceMatches) {
                const startYear = parseInt(match[1]);
                const currentYear = new Date().getFullYear();
                totalExperience += currentYear - startYear;
            }

            // Take the maximum of all calculated experiences
            yearsOfExperience = Math.max(yearsOfExperience, totalExperience);

            // Method 4: Role duration patterns
            const roleDurationPattern = /(\d+)\+?\s*(?:year|yr)s?\s*(?:as|in|of|at)/gi;
            const roleDurations = Array.from(text.matchAll(roleDurationPattern))
                .map(match => parseInt(match[1]));

            if (roleDurations.length > 0) {
                const maxRoleDuration = Math.max(...roleDurations);
                yearsOfExperience = Math.max(yearsOfExperience, maxRoleDuration);
            }

            // If AI analysis has high confidence, use it to adjust the final result
            if (aiAnalysis.confidence > 0.8 && aiAnalysis.experienceSections.length > 0) {
                // Adjust based on AI confidence and number of experience sections
                const aiAdjustment = aiAnalysis.experienceSections.length * 0.5;
                yearsOfExperience = Math.max(yearsOfExperience, aiAdjustment);
            }

            // Ensure reasonable bounds and handle edge cases
            yearsOfExperience = Math.min(Math.max(0, yearsOfExperience), 40);

            return yearsOfExperience;
        } catch (error) {
            console.warn('Error calculating years of experience:', error);
            // Return a safe default if calculation fails
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
            'backend', 'frontend', 'sdl', 'arduino', 'game development', 'c'
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
            // Also check extracted and professional skills
            if (Array.isArray(analysis.technicalProficiency.extracted)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.extracted);
            }
            if (Array.isArray(analysis.technicalProficiency.professional)) {
                allKeySkills = allKeySkills.concat(analysis.technicalProficiency.professional);
            }
        }
        
        // Remove duplicates and normalize
        allKeySkills = [...new Set(allKeySkills.map(s => s.toLowerCase()))];
        console.log('ALL DEVELOPER SKILLS (normalized):', allKeySkills);
        
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
        
        // Calculate score (25 points max, with diminishing returns)
        // Each skill contributes less as the count increases
        let keySkillsScore = 0;
        if (matchedSkillsCount >= 10) keySkillsScore = 25;
        else if (matchedSkillsCount >= 7) keySkillsScore = 20;
        else if (matchedSkillsCount >= 5) keySkillsScore = 15;
        else if (matchedSkillsCount >= 3) keySkillsScore = 10;
        else if (matchedSkillsCount >= 1) keySkillsScore = 5;
        
        console.log('CALCULATED KEY SKILLS SCORE:', keySkillsScore, 
                   '(based on', matchedSkillsCount, 'matched skills out of', allKeySkills.length, 'skills)');
        
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
        
        console.log('FINAL TECHNICAL SCORE CALCULATION:', 
                   'Original:', generalScore.total,
                   'New:', result.total,
                   'Difference:', result.total - generalScore.total);
        
        return result;
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
        const profileType = analysis.profileType?.toLowerCase() || '';
        
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
        allKeySkills = [...new Set(allKeySkills.map(s => s.toLowerCase()))];
        
        // Count matches (with partial matching)
        const matchedSkills = allKeySkills.filter(skill =>
            expectedSkills.some(exp => skill.includes(exp.toLowerCase()) || exp.includes(skill))
        );
        
        const keySkillsScore = Math.min(25, Math.round((matchedSkills.length / 5) * 25));

        // 2. Role Match (15 pts)
        const roleScore = Math.round((analysis.role?.confidence || 0) * 15);

        // 3. Tools Proficiency (10 pts)
        const toolsArray = analysis.technicalProficiency?.tools || [];
        let toolsScore = Math.min(10, Math.round((toolsArray.length / 4) * 10));

        // 4. Experience (10 pts)
        let experienceScore = 0;
        if (analysis.experience?.years >= 6) experienceScore = 10;
        else if (analysis.experience?.years >= 4) experienceScore = 8;
        else if (analysis.experience?.years >= 2) experienceScore = 6;
        else if (analysis.experience?.years >= 1) experienceScore = 4;
        else experienceScore = 2;

        // 5. Education (10 pts)
        let educationScore = 0;
        const level = (analysis.education?.level || '').toLowerCase();
        if (level.includes('master') || level.includes('phd') || level.includes('doctorate')) educationScore = 10;
        else if (level.includes('bachelor')) educationScore = 7;
        else if (level.includes('high school')) educationScore = 4;
        else educationScore = 5;

        // 6. Soft Skills (10 pts)
        const softSkills = (analysis.technicalProficiency?.professional || []);
        let softSkillsScore = 0;
        if (softSkills.length >= 5) softSkillsScore = 10;
        else if (softSkills.length >= 3) softSkillsScore = 7;
        else if (softSkills.length >= 1) softSkillsScore = 4;
        else softSkillsScore = 2;

        // 7. Summary Quality (10 pts)
        let summaryScore = 0;
        const summary = (analysis.summary || '');
        if (summary.length > 200) summaryScore = 8;
        else if (summary.length > 100) summaryScore = 5;
        else if (summary.length > 0) summaryScore = 3;
        else summaryScore = 0;

        // 8. Organizations Quality (10 pts)
        let orgScore = 0;
        const orgs = (analysis.experience?.organizations || []);
        if (orgs.length >= 3) orgScore = 10;
        else if (orgs.length === 2) orgScore = 6;
        else if (orgs.length === 1) orgScore = 3;
        else orgScore = 0;

        // Total
        const total = keySkillsScore + roleScore + toolsScore + experienceScore + 
                      educationScore + softSkillsScore + summaryScore + orgScore;
        
        // Log score details for debugging
        console.log('General CV Analysis Score Calculation:', {
            profileType: profileType || 'general',
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
                years: analysis.experience?.years,
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
                }
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
}

export default new CVAnalysisService(); 