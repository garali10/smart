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
        
        // Enhanced developer skill keywords - much more comprehensive
        if (profileType.includes('developer')) {
            const programmingKeywords = [
                'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'typescript', 
                'swift', 'go', 'kotlin', 'rust', 'perl', 'scala', 'r', 'dart', 'bash', 
                'powershell', 'sql', 'nosql', 'html', 'css', 'sass', 'less', 'assembly',
                'objective-c', 'vba', 'matlab', 'fortran', 'lua', 'haskell', 'clojure',
                'groovy', 'delphi', 'cobol', 'lisp', 'prolog', 'erlang', 'f#', 'ada'
            ];
            
            const frameworkKeywords = [
                'react', 'angular', 'vue', 'svelte', 'jquery', 'backbone', 'ember', 
                'node.js', 'express', 'django', 'flask', 'spring', 'asp.net', 'laravel',
                'symfony', 'rails', 'flask', 'fastapi', 'phoenix', 'nestjs',
                'bootstrap', 'material-ui', 'tailwind', 'sass', 'less',
                'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
                'django rest framework', 'graphql', 'apollo', 'redux', 'mobx', 'vuex',
                'next.js', 'nuxt.js', 'gatsby', 'electron'
            ];
            
            const toolsKeywords = [
                'git', 'github', 'gitlab', 'bitbucket', 'jenkins', 'travis', 'circleci',
                'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'firebase', 'heroku',
                'vercel', 'netlify', 'digital ocean', 'aws lambda', 'serverless',
                'vscode', 'intellij', 'eclipse', 'visual studio', 'sublime text', 'atom',
                'npm', 'yarn', 'webpack', 'babel', 'eslint', 'prettier', 'jest', 'mocha',
                'postman', 'swagger', 'jira', 'trello', 'notion', 'figma', 'sketch'
            ];
            
            const databaseKeywords = [
                'mysql', 'postgresql', 'sql server', 'oracle', 'mongodb', 'dynamodb',
                'cassandra', 'redis', 'elasticsearch', 'firebase', 'sqlite', 'mariadb',
                'neo4j', 'couchdb', 'rethinkdb', 'cosmosdb', 'firestore', 'supabase'
            ];
            
            // Use more sophisticated pattern matching that handles different forms of the same technology
            const matchKeywords = (keywordList) => {
                return keywordList.filter(keyword => {
                    const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                    return pattern.test(lowerText);
                }).map(skill => ({ name: skill, confidence: 0.9 }));
            };
            
            const matchedProgramming = matchKeywords(programmingKeywords);
            const matchedFrameworks = matchKeywords(frameworkKeywords);
            const matchedTools = matchKeywords(toolsKeywords);
            const matchedDatabases = matchKeywords(databaseKeywords);
            
            // Extract years of experience with technologies
            const extractExperienceYears = (tech) => {
                const patterns = [
                    new RegExp(`(\\d+)\\s*(?:years|yrs|yr|\\+\\s*years|\\+)\\s*(?:of)?\\s*experience\\s*(?:with|in|using)?\\s*${tech}`, 'i'),
                    new RegExp(`${tech}\\s*(?:experience|expertise)\\s*(?:for|of)?\\s*(\\d+)\\s*(?:years|yrs|yr|\\+)`, 'i')
                ];
                
                for (const pattern of patterns) {
                    const match = lowerText.match(pattern);
                    if (match && match[1]) {
                        return parseInt(match[1]);
                    }
                }
                return 0;
            };
            
            // Add default skills if none matched - ensure we have at least some skills
            if (matchedProgramming.length === 0) {
                // Check for general development terms
                if (lowerText.includes('web development') || lowerText.includes('software development')) {
                    matchedProgramming.push(
                        { name: 'JavaScript', confidence: 0.8 },
                        { name: 'HTML/CSS', confidence: 0.8 }
                    );
                }
            }
            
            // Add additional tools for developers
            const additionalDevTools = [];
            if (lowerText.includes('version control') || lowerText.includes('git')) {
                additionalDevTools.push({ name: 'Git', confidence: 0.9 });
            }
            if (lowerText.includes('agile') || lowerText.includes('scrum')) {
                additionalDevTools.push({ name: 'Agile Methodology', confidence: 0.9 });
            }
            
            skillSets.push(
                { type: 'programming', skills: matchedProgramming },
                { type: 'frameworks', skills: matchedFrameworks },
                { type: 'tools', skills: [...matchedTools, ...additionalDevTools] },
                { type: 'databases', skills: matchedDatabases }
            );
        }
        
        // Other profile types (similar enhancements) - keeping what's there
        
        // Add professional skills with more nuance
        const professionalKeywords = [
            'project management', 'team leadership', 'problem solving', 'communication',
            'time management', 'collaboration', 'analytical thinking', 'attention to detail',
            'creativity', 'adaptability', 'agile', 'scrum', 'kanban', 'presentation',
            'critical thinking', 'teamwork', 'customer service', 'research', 'planning',
            'documentation', 'reporting', 'mentoring', 'conflict resolution'
        ];
        
        const matchedProfessional = professionalKeywords
            .filter(keyword => lowerText.includes(keyword.toLowerCase()))
            .map(skill => ({ name: skill, confidence: 0.9 }));
            
        // Add some default professional skills if none matched
        if (matchedProfessional.length === 0) {
            matchedProfessional.push(
                { name: 'communication', confidence: 0.8 },
                { name: 'teamwork', confidence: 0.8 },
                { name: 'problem solving', confidence: 0.7 }
            );
        }
        
        skillSets.push({ type: 'professional', skills: matchedProfessional });
        
        return skillSets;
    }

    async determineProfileType(text) {
        try {
            const normalizedText = text.toLowerCase();
            const headerTitle = this.extractHeaderJobTitle(text).toLowerCase();
            
            // Strong signal from header - expanded to catch more variations
            if (headerTitle.includes('developer') || headerTitle.includes('engineer') || 
                headerTitle.includes('programmer') || headerTitle.includes('software') || 
                headerTitle.includes('coder') || headerTitle.includes('web dev')) 
                return { type: 'developer', counts: { developer: 1 }, primary: 'developer' };
            
            if (headerTitle.includes('designer') || headerTitle.includes('ux') || 
                headerTitle.includes('ui') || headerTitle.includes('graphic'))
                return { type: 'designer', counts: { designer: 1 }, primary: 'designer' };
            
            if (headerTitle.includes('sales') || headerTitle.includes('account executive') || 
                headerTitle.includes('business development') || headerTitle.includes('sales rep'))
                return { type: 'sales', counts: { sales: 1 }, primary: 'sales' };
            
            if (headerTitle.includes('marketing') || headerTitle.includes('brand') || 
                headerTitle.includes('growth') || headerTitle.includes('content strategist') ||
                headerTitle.includes('digital marketing'))
                return { type: 'marketing', counts: { marketing: 1 }, primary: 'marketing' };
            
            if (headerTitle.includes('mechanical engineer') || headerTitle.includes('civil engineer') ||
                headerTitle.includes('electrical engineer') || headerTitle.includes('engineering'))
                return { type: 'engineer', counts: { engineer: 1 }, primary: 'engineer' };
            
            // Check for common role titles with stronger patterns
            // Marketing roles
            if (normalizedText.match(/marketing\s+(manager|director|specialist|coordinator|associate)/i) ||
                normalizedText.match(/digital\s+marketing/i) ||
                normalizedText.match(/(brand|content)\s+(manager|specialist)/i)) {
                return { type: 'marketing', counts: { marketing: 5 }, primary: 'marketing' };
            }
            
            // Sales roles
            if (normalizedText.match(/sales\s+(representative|manager|executive|associate|agent)/i) ||
                normalizedText.match(/account\s+(manager|executive)/i) ||
                normalizedText.match(/business\s+development/i)) {
                return { type: 'sales', counts: { sales: 5 }, primary: 'sales' };
            }
            
            // Engineering roles
            if (normalizedText.match(/(mechanical|civil|electrical|software|systems|biomedical)\s+engineer/i) ||
                normalizedText.match(/engineer\s+(i|ii|iii|iv|v|senior|junior|lead|principal)/i) ||
                normalizedText.match(/r&d\s+engineer/i)) {
                return { type: 'engineer', counts: { engineer: 5 }, primary: 'engineer' };
            }
            
            // Designer roles
            if (normalizedText.match(/(ui|ux|web|graphic)\s+designer/i) ||
                normalizedText.match(/user\s+(interface|experience)/i) ||
                normalizedText.match(/interaction\s+design/i)) {
                return { type: 'designer', counts: { designer: 5 }, primary: 'designer' };
            }
            
            // Enhanced keyword lists for better detection
            const marketingTerms = [
                'marketing', 'digital marketing', 'social media', 'advertising', 'brand', 'seo',
                'content marketing', 'campaign', 'market research', 'public relations', 'pr',
                'content strategy', 'email marketing', 'google analytics', 'crm', 'hubspot',
                'mailchimp', 'campaign management', 'analytics', 'market analysis', 'customer acquisition',
                'marketing manager', 'marketing specialist', 'marketing coordinator', 'marketing analyst',
                'growth hacking', 'marketing automation', 'ppc', 'sem', 'inbound marketing', 'social media',
                'digital campaigns', 'content creation', 'branding', 'brand strategy', 'marketing plan',
                'kpis', 'metrics', 'marketing budget', 'target audience', 'marketing channels'
            ];
            
            const technicalTerms = [
                'developer', 'developpeur', 'engineer', 'software', 'programming', 'coding', 'c\+\+', 
                'java', 'python', 'javascript', 'php', 'git', 'qt', 'linux', 'mysql', 'css', 'html', 
                'arduino', 'symfony', 'flutter', 'framework', 'api', 'backend', 'frontend', 'fullstack',
                'debugging', 'algorithm', 'data structure', 'devops', 'cloud', 'aws', 'azure', 'ci/cd'
            ];
            
            const engineeringTerms = [
                'mechanical engineer', 'civil engineer', 'electrical engineer', 'engineering', 'cad',
                'autocad', 'solidworks', 'finite element analysis', 'fea', 'matlab', 'thermodynamics',
                'fluid dynamics', 'structural analysis', 'project engineering', 'manufacturing',
                'product development', 'r&d', 'research and development', 'prototype', 'systems engineering',
                'industrial engineering', 'technical design', 'engineering design', 'simulation',
                'circuit design', 'hardware', 'robotics', 'control systems', 'mechanism design',
                'technical documentation', 'production', 'tolerancing', 'gd&t', 'technical specifications'
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
                'sales representative', 'inside sales', 'outside sales', 'sales associate', 'revenue', 
                'customer retention', 'cold calling', 'sales strategy', 'client management', 'client portfolio',
                'conversion rate', 'sales target', 'sales goal', 'upselling', 'cross-selling', 'deal',
                'contract', 'commission', 'sales cycle', 'customer success', 'business development'
            ];
            
            const businessTerms = [
                'business', 'management', 'operations', 'strategy', 'finance', 'sales', 
                'business development', 'account management', 'project management', 'mba',
                'business administration', 'leadership', 'team management', 'strategic planning',
                'customer success', 'client relations', 'negotiation', 'business strategy'
            ];
            
            // Improved counting logic with better weighting for stronger terms
            const countOccurrences = (terms, weightMultiplier = 1) => {
                return terms.reduce((count, term) => {
                    const regex = new RegExp('\\b' + term + '\\b', 'gi');
                    const matches = normalizedText.match(regex);
                    const matchCount = matches ? matches.length : 0;
                    
                    // Give more weight to title-related terms
                    const weight = term.includes('manager') || term.includes('director') || 
                                   term.includes('engineer') || term.includes('representative') ? 
                                   2 * weightMultiplier : weightMultiplier;
                                    
                    return count + (matchCount * weight);
                }, 0);
            };
            
            const marketingCount = countOccurrences(marketingTerms, 1.2); // Slightly boost marketing
            const technicalCount = countOccurrences(technicalTerms);
            const engineeringCount = countOccurrences(engineeringTerms, 1.2); // Boost engineering
            const designCount = countOccurrences(designTerms);
            const salesCount = countOccurrences(salesTerms, 1.2); // Slightly boost sales
            const businessCount = countOccurrences(businessTerms);
            
            // Combine technical and engineering categories if both have significant counts
            let counts = {
                marketing: marketingCount,
                developer: technicalCount,
                engineer: engineeringCount,
                designer: designCount,
                sales: salesCount,
                business: businessCount
            };
            
            // If engineering and developer both have counts, consider merging them
            if (engineeringCount > 0 && technicalCount > 0) {
                // If mechanical, civil, electrical engineering is mentioned, prioritize that
                if (normalizedText.includes('mechanical') || normalizedText.includes('civil') || 
                    normalizedText.includes('electrical') || normalizedText.includes('industrial')) {
                    counts.engineer += technicalCount * 0.5; // Add half of tech score to engineering
                } else {
                    counts.developer += engineeringCount * 0.5; // Otherwise boost developer score
                }
            }
            
            console.log('Profile type counts:', counts);
            
            // Find the top two categories
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const [topType, topCount] = sorted[0];
            const [secondType, secondCount] = sorted[1];
            
            // If the top count is significantly higher, use that profile
            if (topCount >= 2 && topCount > secondCount * 1.3) {
                return { type: topType, counts, primary: topType };
            }
            
            // If sales and business are close together, prefer sales for more specific analysis
            if ((topType === 'sales' && secondType === 'business') || 
                (topType === 'business' && secondType === 'sales')) {
                if (salesCount >= 2) {
                    return { type: 'sales', counts, primary: 'sales' };
                }
            }
            
            // If marketing and business are close, prefer marketing
            if ((topType === 'marketing' && secondType === 'business') || 
                (topType === 'business' && secondType === 'marketing')) {
                if (marketingCount >= 2) {
                    return { type: 'marketing', counts, primary: 'marketing' };
                }
            }
            
            // If engineering and developer are close, check specific terms
            if ((topType === 'engineer' && secondType === 'developer') || 
                (topType === 'developer' && secondType === 'engineer')) {
                if (normalizedText.includes('mechanical') || normalizedText.includes('civil') || 
                    normalizedText.includes('electrical')) {
                    return { type: 'engineer', counts, primary: 'engineer' };
                } else {
                    return { type: 'developer', counts, primary: 'developer' };
                }
            }
            
            // Only assign if the top is at least 1.5 more than the next (reduced from 2)
            if (topCount >= 2 && topCount - secondCount >= 1.5) {
                return { type: topType, counts, primary: topType };
            }
            
            // Fallback to the type with highest count if it's at least 2
            if (topCount >= 2) {
                return { type: topType, counts, primary: topType };
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
        try {
            // First try to find an explicit skills section
            const skillsSectionRegex = /(?:skills|technical skills|core competencies|expertise|proficiencies)\s*[:\-\n]+\s*([\s\S]*?)(?:\n\s*\n|education|work experience|employment|profile|projects|certifications|languages|interests|hobbies|references|$)/i;
            const match = text.match(skillsSectionRegex);
            
            // Process if we find a skills section
            if (match && match[1]) {
                // Split by commas, bullets, or newlines, trim, and filter out empty
                const rawSkills = match[1].split(/,|\n|•|\*|-|\/|\|/).map(s => s.trim()).filter(Boolean);
                
                // Clean up the skills - remove common prefixes and noise
                return rawSkills.map(skill => 
                    skill.replace(/^(?:proficient in|knowledge of|experience with|advanced|intermediate|beginner)\s+/i, '')
                        .replace(/\(.+\)/, '')
                        .trim()
                ).filter(s => s.length > 1 && s.length < 50); // Filter out too short or too long entries
            }
            
            // If no explicit skills section, try to identify skills throughout the document
            // Look for lists of technologies or skills
            const techListPattern = /(?:technologies|programming languages|frameworks|tools|platforms|environments)(?:\s+used)?(?:\s+include)?:?\s*([\w\s,./+#\-&]+)(?:\n|\.)/i;
            const techMatch = text.match(techListPattern);
            
            if (techMatch && techMatch[1]) {
                return techMatch[1].split(/,|\n|•|\*|-|\/|\|/).map(s => s.trim()).filter(Boolean);
            }
            
            // As a last resort, extract common technical terms directly
            const techTerms = [
                'javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'typescript', 'swift', 'go',
                'react', 'angular', 'vue.js', 'node.js', 'django', 'flask', 'spring', 'laravel', 'asp.net',
                'html', 'css', 'sass', 'less', 'bootstrap', 'tailwind', 'material-ui',
                'git', 'github', 'gitlab', 'bitbucket', 'jenkins', 'travis', 'circleci',
                'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'firebase', 'heroku',
                'mysql', 'postgresql', 'mongodb', 'sql server', 'oracle', 'sqlite', 'redis'
            ];
            
            const foundTerms = techTerms.filter(term => {
                const pattern = new RegExp(`\\b${term}\\b`, 'i');
                return pattern.test(text);
            });
            
            if (foundTerms.length > 0) {
                return foundTerms;
            }
        } catch (error) {
            console.error('Error extracting skills section:', error);
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

            // Method 2: Date analysis from dates
            const yearPattern = /\b(19|20)\d{2}\b/g;
            const allText = dates.join(' ') + ' ' + text;
            const years = Array.from(allText.matchAll(yearPattern))
                .map(match => parseInt(match[0]))
                .filter(year => year <= currentYear && year >= 1950) // Realistic range
                .sort();

            if (years.length >= 2) {
                const earliestYear = years[0];
                const latestYear = years[years.length - 1];
                if (latestYear - earliestYear >= 1) {
                    yearsOfExperience = Math.max(0, latestYear - earliestYear);
                }
            }

            // Method 3: Experience duration patterns - enhanced
            let totalExperience = 0;

            // Pattern for "2020 - Present" or "2020 - Current"
            const presentPatterns = [
                /(\d{4})\s*(?:-|to|–|—|until|through)\s*(present|current|now|today|ongoing)/gi,
                /since\s*(\d{4})/gi,
                /from\s*(\d{4})\s*(?:to\s*now|to\s*present|onwards|onward|to\s*date)/gi
            ];
            
            for (const pattern of presentPatterns) {
                const matches = Array.from(text.matchAll(pattern));
                for (const match of matches) {
                    const startYear = parseInt(match[1]);
                    if (startYear > 1950 && startYear <= currentYear) {
                        totalExperience += currentYear - startYear;
                    }
                }
            }

            // Pattern for date ranges like "2018-2020" or "2018 to 2020"
            const rangePattern = /(\d{4})\s*(?:-|to|–|—|until|through)\s*(\d{4})/g;
            const rangeMatches = Array.from(text.matchAll(rangePattern));
            for (const match of rangeMatches) {
                const startYear = parseInt(match[1]);
                const endYear = parseInt(match[2]);
                if (endYear > startYear && startYear > 1950 && endYear <= currentYear) {
                    totalExperience += endYear - startYear;
                }
            }

            // If no experience found, but we have job titles or role mentions
            if (yearsOfExperience === 0 && totalExperience === 0) {
                const rolePattern = /(?:position|role|job|title)(?:\s+as|\s+of|\s+at|\s+in)?\s+(?:a|an)?\s+(\w+)/gi;
                const roleMatches = Array.from(text.matchAll(rolePattern));
                if (roleMatches.length > 0) {
                    // Assume at least 1 year of experience for each role mentioned
                    yearsOfExperience = Math.min(roleMatches.length, 5); // Cap at 5 years to be realistic
                }
            }

            // Take the maximum of all calculated experiences
            yearsOfExperience = Math.max(yearsOfExperience, totalExperience);

            // Adjust weight based on education level mentions
            if (text.toLowerCase().includes('phd') || text.toLowerCase().includes('doctorate')) {
                yearsOfExperience = Math.max(yearsOfExperience, 4); // At least 4 years for PhD
            } else if (text.toLowerCase().includes('master')) {
                yearsOfExperience = Math.max(yearsOfExperience, 2); // At least 2 years for Master's
            } else if (text.toLowerCase().includes('bachelor') || text.toLowerCase().includes('degree')) {
                yearsOfExperience = Math.max(yearsOfExperience, 1); // At least 1 year for Bachelor's
            }

            // Ensure reasonable bounds and handle edge cases
            yearsOfExperience = Math.min(Math.max(0, yearsOfExperience), 25);

            // Default minimum experience for developers with skills
            if (yearsOfExperience === 0 && text.toLowerCase().includes('developer')) {
                return 1; // Give at least 1 year of experience to developers
            }

            return yearsOfExperience;
        } catch (error) {
            console.warn('Error calculating years of experience:', error);
            // Return a reasonable default if calculation fails
            return text.toLowerCase().includes('developer') ? 1 : 0;
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
        // 1. Key Skills Match (30 pts) - increased weight
        const expectedSkills = [
            'digital marketing', 'content marketing', 'social media marketing', 'seo',
            'email marketing', 'brand management', 'market research', 'marketing analytics',
            'campaign management', 'marketing strategy', 'content creation', 'copywriting',
            'marketing automation', 'google analytics', 'social media', 'content strategy',
            'ppc', 'sem', 'google ads', 'facebook ads', 'instagram', 'lead generation',
            'conversion optimization', 'a/b testing', 'landing pages'
        ];
        
        // Combine all key skills from extracted and AI-detected
        let allKeySkills = [];
        if (Array.isArray(analysis.keySkills)) {
            allKeySkills = analysis.keySkills;
        }
        
        // Also check all technical proficiency sections
        if (analysis.technicalProficiency) {
            Object.keys(analysis.technicalProficiency).forEach(key => {
                if (Array.isArray(analysis.technicalProficiency[key])) {
                    allKeySkills = allKeySkills.concat(analysis.technicalProficiency[key]);
                }
            });
        }
        
        // Remove duplicates and normalize
        allKeySkills = [...new Set(allKeySkills.map(s => {
            if (typeof s === 'string') return s.toLowerCase();
            return s.name ? s.name.toLowerCase() : '';
        }))].filter(Boolean);
        
        // Count matches (with partial matching)
        let matchedSkillsCount = 0;
        for (const skill of allKeySkills) {
            for (const expectedSkill of expectedSkills) {
                if (skill.includes(expectedSkill) || expectedSkill.includes(skill)) {
                    matchedSkillsCount++;
                    break;
                }
            }
        }
        
        // More generous scoring for skills
        let keySkillsScore = 0;
        if (matchedSkillsCount >= 8) keySkillsScore = 30;
        else if (matchedSkillsCount >= 6) keySkillsScore = 25;
        else if (matchedSkillsCount >= 4) keySkillsScore = 20;
        else if (matchedSkillsCount >= 2) keySkillsScore = 15;
        else if (matchedSkillsCount >= 1) keySkillsScore = 10;
        else keySkillsScore = 5; // Give some points by default
        
        // Use general score but override the key skills score
        const generalScore = this.calculateGeneralScore(analysis);
        
        // Education is important for marketing
        let educationScore = generalScore.breakdown.educationScore;
        // If marketing degree or business degree mentioned, boost education score
        if (analysis.education && analysis.education.level && 
            (analysis.education.level.toLowerCase().includes('marketing') || 
             analysis.education.level.toLowerCase().includes('business'))) {
            educationScore = Math.max(educationScore, 8);
        }
        
        // Experience is important for marketing
        let experienceScore = generalScore.breakdown.experienceScore;
        // If experience exists but is low, boost it for marketing roles
        if (experienceScore > 0 && experienceScore < 6) {
            experienceScore = Math.min(experienceScore + 2, 10); // Boost but cap at 10
        }
        
        const result = {
            ...generalScore,
            breakdown: {
                ...generalScore.breakdown,
                keySkillsScore: keySkillsScore,
                educationScore: educationScore,
                experienceScore: experienceScore
            }
        };
        
        // Ensure the total score reflects our changes
        result.total = (result.total - 
                       (generalScore.breakdown.keySkillsScore + 
                        generalScore.breakdown.educationScore + 
                        generalScore.breakdown.experienceScore)) + 
                       keySkillsScore + educationScore + experienceScore;
        
        // Add a bonus for marketing CVs with good skills
        if (matchedSkillsCount >= 4 && result.total < 60) {
            const bonus = 8;
            result.total += bonus;
            console.log('Applied marketing skill bonus:', bonus);
        }
        
        return result;
    }
    
    calculateSalesScore(analysis) {
        // 1. Key Skills Match (30 pts)
        const expectedSkills = [
            'sales', 'lead generation', 'negotiation', 'closing deals', 'prospecting',
            'account management', 'pipeline management', 'crm', 'customer relationship',
            'territory management', 'quota attainment', 'cold calling', 'sales presentations',
            'client acquisition', 'relationship building', 'salesforce', 'sales forecasting',
            'contract negotiation', 'solution selling', 'b2b sales', 'b2c sales', 'sales funnel',
            'sales cycle', 'upselling', 'cross-selling', 'client retention', 'revenue growth'
        ];
        
        // Combine all key skills from extracted and AI-detected
        let allKeySkills = [];
        if (Array.isArray(analysis.keySkills)) {
            allKeySkills = analysis.keySkills;
        }
        
        // Also check all technical proficiency sections
        if (analysis.technicalProficiency) {
            Object.keys(analysis.technicalProficiency).forEach(key => {
                if (Array.isArray(analysis.technicalProficiency[key])) {
                    allKeySkills = allKeySkills.concat(analysis.technicalProficiency[key]);
                }
            });
        }
        
        // Remove duplicates and normalize
        allKeySkills = [...new Set(allKeySkills.map(s => {
            if (typeof s === 'string') return s.toLowerCase();
            return s.name ? s.name.toLowerCase() : '';
        }))].filter(Boolean);
        
        // Count matches (with partial matching)
        let matchedSkillsCount = 0;
        for (const skill of allKeySkills) {
            for (const expectedSkill of expectedSkills) {
                if (skill.includes(expectedSkill) || expectedSkill.includes(skill)) {
                    matchedSkillsCount++;
                    break;
                }
            }
        }
        
        // More generous scoring for skills
        let keySkillsScore = 0;
        if (matchedSkillsCount >= 8) keySkillsScore = 30;
        else if (matchedSkillsCount >= 6) keySkillsScore = 25;
        else if (matchedSkillsCount >= 4) keySkillsScore = 20;
        else if (matchedSkillsCount >= 2) keySkillsScore = 15;
        else if (matchedSkillsCount >= 1) keySkillsScore = 10;
        else keySkillsScore = 5; // Give some points by default
        
        // Use general score but override the key skills score
        const generalScore = this.calculateGeneralScore(analysis);
        
        // Business education is important for sales
        let educationScore = generalScore.breakdown.educationScore;
        // If business-related degree mentioned, boost education score
        if (analysis.education && analysis.education.level && 
            (analysis.education.level.toLowerCase().includes('business') || 
             analysis.education.level.toLowerCase().includes('marketing') ||
             analysis.education.level.toLowerCase().includes('sales'))) {
            educationScore = Math.max(educationScore, 8);
        }
        
        // For sales, look for revenue impact mentions
        let roleScore = generalScore.breakdown.roleScore;
        const lowerText = (analysis.summary || '').toLowerCase();
        if (lowerText.includes('revenue') || 
            lowerText.includes('exceeded quota') || 
            lowerText.includes('top performer') ||
            lowerText.includes('sales target') ||
            lowerText.includes('achieved')) {
            roleScore = Math.max(roleScore, 12); // Increased role confidence
        }
        
        const result = {
            ...generalScore,
            breakdown: {
                ...generalScore.breakdown,
                keySkillsScore: keySkillsScore,
                educationScore: educationScore,
                roleScore: roleScore
            }
        };
        
        // Ensure the total score reflects our changes
        result.total = (result.total - 
                       (generalScore.breakdown.keySkillsScore + 
                        generalScore.breakdown.educationScore +
                        generalScore.breakdown.roleScore)) + 
                       keySkillsScore + educationScore + roleScore;
        
        // Add a bonus for sales CVs that mention achievements
        if (lowerText.includes('exceed') || lowerText.includes('award') || 
            lowerText.includes('top') || lowerText.includes('achieved') || 
            lowerText.includes('grew') || lowerText.includes('increased')) {
            const bonus = 8;
            result.total += bonus;
            console.log('Applied sales achievement bonus:', bonus);
        }
        
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
        // 1. Key Skills Match (30 pts) - increased weight from 25
        const expectedSkills = [
            'javascript', 'python', 'java', 'c++', 'c#', 'php', 'typescript', 'react', 'node.js', 'angular',
            'vue.js', 'git', 'sql', 'html', 'css', 'docker', 'aws', 'linux', 'api development', 'fullstack', 
            'backend', 'frontend', 'software development', 'web development', 'mobile development', 'coding'
        ];
        
        // Combine all key skills from extracted and AI-detected
        let allKeySkills = [];
        if (Array.isArray(analysis.keySkills)) {
            allKeySkills = analysis.keySkills;
        }
        
        // Also check technicalProficiency.programming/frameworks if present
        if (analysis.technicalProficiency) {
            Object.keys(analysis.technicalProficiency).forEach(key => {
                if (Array.isArray(analysis.technicalProficiency[key])) {
                    allKeySkills = allKeySkills.concat(analysis.technicalProficiency[key]);
                }
            });
        }
        
        // Remove duplicates and normalize
        allKeySkills = [...new Set(allKeySkills.map(s => typeof s === 'string' ? s.toLowerCase() : 
            (s.name ? s.name.toLowerCase() : '')))].filter(Boolean);
        console.log('ALL DEVELOPER SKILLS (normalized):', allKeySkills);
        
        // Count matching skills from expected set - more sophisticated matching
        let matchedSkillsCount = 0;
        for (const skill of allKeySkills) {
            for (const expectedSkill of expectedSkills) {
                if (skill.includes(expectedSkill) || expectedSkill.includes(skill)) {
                    matchedSkillsCount++;
                    break;
                }
            }
        }
        
        // More generous scoring for skills
        let keySkillsScore = 0;
        if (matchedSkillsCount >= 7) keySkillsScore = 30;
        else if (matchedSkillsCount >= 5) keySkillsScore = 25;
        else if (matchedSkillsCount >= 3) keySkillsScore = 20;
        else if (matchedSkillsCount >= 2) keySkillsScore = 15;
        else if (matchedSkillsCount >= 1) keySkillsScore = 10;
        else keySkillsScore = 5; // Give some points by default
        
        console.log('CALCULATED KEY SKILLS SCORE:', keySkillsScore, 
                   '(based on', matchedSkillsCount, 'matched skills out of', allKeySkills.length, 'skills)');
        
        // Use general score but override the key skills score
        const generalScore = this.calculateGeneralScore(analysis);
        
        // Education score should be more generous
        let educationScore = generalScore.breakdown.educationScore;
        // If education is not specified but skills suggest a technical background, assume some education
        if (educationScore <= 5 && matchedSkillsCount >= 3) {
            educationScore = 8; // Assume at least some formal education or self-learning
        }
        
        // Experience score should be more generous for technical profiles
        let experienceScore = generalScore.breakdown.experienceScore;
        // If little experience but good skills, assume some experience
        if (experienceScore <= 4 && matchedSkillsCount >= 4) {
            experienceScore = 5; // Assume at least some experience based on skill level
        }
        
        // Tools score adjustment
        let toolsScore = generalScore.breakdown.toolsScore;
        if (analysis.technicalProficiency && 
            (analysis.technicalProficiency.tools || []).length > 0) {
            // If tools mentioned specifically in tech profile, give more points
            toolsScore = Math.max(toolsScore, 5);
        }
        
        const result = {
            ...generalScore,
            breakdown: {
                ...generalScore.breakdown,
                keySkillsScore: keySkillsScore,
                educationScore: educationScore,
                experienceScore: experienceScore,
                toolsScore: toolsScore
            }
        };
        
        // Ensure the total score reflects our changes
        result.total = (result.total - 
                       (generalScore.breakdown.keySkillsScore + 
                        generalScore.breakdown.educationScore + 
                        generalScore.breakdown.experienceScore + 
                        generalScore.breakdown.toolsScore)) + 
                       keySkillsScore + educationScore + experienceScore + toolsScore;
        
        // Add a bonus for developer CVs with good skills but incomplete data
        if (matchedSkillsCount >= 3 && result.total < 50) {
            const bonus = 10;
            result.total += bonus;
            console.log('Applied developer skill bonus:', bonus);
        }
        
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
        allKeySkills = [...new Set(allKeySkills.map(s => {
            if (typeof s === 'string') return s.toLowerCase();
            return s.name ? s.name.toLowerCase() : '';
        }))].filter(Boolean);
        
        // Count matches (with partial matching)
        const matchedSkills = allKeySkills.filter(skill =>
            expectedSkills.some(exp => skill.includes(exp.toLowerCase()) || exp.includes(skill))
        );
        
        // More generous key skills scoring
        const keySkillsScore = Math.min(25, Math.max(5, Math.round((matchedSkills.length / 3) * 25)));

        // 2. Role Match (15 pts)
        const roleScore = Math.max(5, Math.round((analysis.role?.confidence || 0.3) * 15));

        // 3. Tools Proficiency (10 pts)
        const toolsArray = analysis.technicalProficiency?.tools || [];
        let toolsScore = Math.min(10, Math.max(3, Math.round((toolsArray.length / 3) * 10)));

        // 4. Experience (15 pts) - increased from 10
        let experienceScore = 0;
        const years = analysis.experience?.years || 0;
        if (years >= 6) experienceScore = 15;
        else if (years >= 4) experienceScore = 12;
        else if (years >= 2) experienceScore = 9;
        else if (years >= 1) experienceScore = 6;
        else experienceScore = 3; // Minimum score, was 2

        // 5. Education (10 pts)
        let educationScore = 0;
        const level = (analysis.education?.level || '').toLowerCase();
        if (level.includes('master') || level.includes('phd') || level.includes('doctorate')) educationScore = 10;
        else if (level.includes('bachelor')) educationScore = 8; // Increased from 7
        else if (level.includes('high school')) educationScore = 5; // Increased from 4
        else educationScore = 5; // Default when unspecified

        // 6. Soft Skills (10 pts)
        const softSkills = (analysis.technicalProficiency?.professional || []);
        let softSkillsScore = 0;
        if (softSkills.length >= 4) softSkillsScore = 10;
        else if (softSkills.length >= 2) softSkillsScore = 7;
        else if (softSkills.length >= 1) softSkillsScore = 5; // Increased from 4
        else softSkillsScore = 3; // Increased from 2

        // 7. Summary Quality (10 pts)
        let summaryScore = 0;
        const summary = (analysis.summary || '');
        if (summary.length > 150) summaryScore = 8;
        else if (summary.length > 75) summaryScore = 5;
        else if (summary.length > 0) summaryScore = 3;
        else summaryScore = 2; // Minimum 2 points instead of 0

        // 8. Organizations Quality (5 pts) - reduced from 10
        let orgScore = 0;
        const orgs = (analysis.experience?.organizations || []);
        if (orgs.length >= 3) orgScore = 5;
        else if (orgs.length === 2) orgScore = 4;
        else if (orgs.length === 1) orgScore = 3;
        else orgScore = 1; // Minimum 1 point instead of 0

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