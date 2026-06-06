const https = require('https');

class LeadScoringEngine {
    scoreLeadQuality(data) {
        let score = 0;
        let factors = [];

        // Timeline scoring (strongest indicator)
        if (data.timeline === 'ASAP / This Month') {
            score += 35;
            factors.push('Ready within 1 month');
        } else if (data.timeline === 'Within 3 months') {
            score += 25;
            factors.push('Ready within 3 months');
        } else if (data.timeline === 'Within 6 months') {
            score += 15;
            factors.push('6 month timeline');
        } else if (data.timeline === 'Next year') {
            score += 5;
            factors.push('12+ month timeline');
        } else {
            factors.push('Exploring options');
        }

        // Income bracket scoring
        if (data.income === '₱100,000+') {
            score += 20;
            factors.push('Very high income');
        } else if (data.income === '₱60,000 - ₱100,000') {
            score += 18;
            factors.push('High income');
        } else if (data.income === '₱40,000 - ₱60,000') {
            score += 12;
            factors.push('Moderate-high income');
        } else if (data.income === '₱25,000 - ₱40,000') {
            score += 8;
            factors.push('Moderate income');
        }

        // TCP Budget alignment
        if (data.tcp === '₱5M+') {
            score += 10;
            factors.push('High investment capacity');
        } else if (data.tcp === '₱4M - ₱5M' || data.tcp === '₱3M - ₱4M') {
            score += 8;
            factors.push('Strong purchasing power');
        } else if (data.tcp === '₱2M - ₱3M') {
            score += 5;
            factors.push('Moderate purchasing power');
        }

        // Monthly budget readiness
        if (data.monthly === '₱30,000+') {
            score += 8;
            factors.push('High monthly capacity');
        } else if (data.monthly === '₱20,000 - ₱30,000') {
            score += 6;
            factors.push('Comfortable monthly budget');
        }

        // Site visit availability
        if (data.visit === 'This Week' || data.visit === 'This Weekend') {
            score += 15;
            factors.push('Highly available for visits');
        } else if (data.visit === 'Next Week') {
            score += 8;
            factors.push('Available for visits');
        }

        // Financing type - serious buyers
        if (data.financing === 'Spot Cash') {
            score += 12;
            factors.push('Cash buyer - immediate');
        } else if (data.financing === 'Bank Financing' || data.financing === 'PAG-IBIG Financing') {
            score += 10;
            factors.push('Financing arranged');
        } else if (data.financing === 'Deferred Cash') {
            score += 6;
            factors.push('Cash buyer - flexible');
        }

        // Purpose
        if (data.purpose === 'Personal Home') {
            score += 5;
            factors.push('Primary residence');
        } else if (data.purpose === 'Investment / Rental Income') {
            score += 4;
            factors.push('Investment property');
        }

        // Decision maker
        if (data.decision === 'Self + Spouse' || data.decision === 'Family involved') {
            score += 4;
            factors.push('Strong decision maker');
        }

        // Income source stability
        if (data.source === 'Employed' || data.source === 'OFW' || data.source === 'Seafarer') {
            score += 3;
            factors.push('Stable income source');
        } else if (data.source === 'Business Owner') {
            score += 4;
            factors.push('Entrepreneur - growth potential');
        }

        return { score, factors };
    }

    getLeadStatus(score, timeline) {
        if (score >= 75 && (timeline === 'ASAP / This Month' || timeline === 'Within 3 months')) {
            return 'HOT';
        } else if (score >= 50) {
            return 'WARM';
        } else {
            return 'COLD';
        }
    }

    getBuyerType(data) {
        const isHighIncome = data.income === '₱100,000+' || data.income === '₱60,000 - ₱100,000';
        const isHighBudget = data.tcp === '₱5M+' || data.tcp === '₱4M - ₱5M';
        const isCash = data.financing === 'Spot Cash';
        const timeline = data.timeline;

        if (isHighBudget && isHighIncome && isCash) {
            return 'Premium Buyer';
        } else if (data.purpose === 'Investment / Rental Income' && isHighIncome) {
            return 'Investor';
        } else if (isHighBudget || isHighIncome) {
            return 'Standard Buyer';
        } else {
            return 'Budget Conscious Buyer';
        }
    }

    getRecommendedAction(status, score, timeline) {
        if (status === 'HOT') {
            return '🔥 PRIORITY: Contact immediately. Schedule property viewing within 24 hours. High conversion potential.';
        } else if (status === 'WARM') {
            if (score >= 65) {
                return '📞 URGENT: Contact within 12-24 hours. Share premium properties matching criteria.';
            } else if (score >= 55) {
                return '📞 Contact within 24-48 hours. Provide property recommendations and financing options.';
            } else {
                return '✉️ Follow-up within this week. Clarify budget and timeline. Send property brochures.';
            }
        } else {
            if (timeline === 'Within 6 months') {
                return '📅 Schedule follow-up for next month. Provide market insights and appreciation data.';
            } else if (timeline === 'Next year' || timeline === 'Still canvassing') {
                return '📧 Add to nurture list. Send monthly market updates and new listings.';
            } else {
                return '📧 Add to mailing list. Provide general real estate resources and guides.';
            }
        }
    }
}

class TelegramBot {
    constructor(botToken, chatId) {
        this.botToken = botToken;
        this.chatId = chatId;
    }

    formatMessage(data, leadScore, leadStatus, buyerType, recommendedAction) {
        const timestamp = new Date().toLocaleString('en-PH', { 
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const message = `
🏡 *NEW LEAD RECEIVED*
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 *CONTACT INFO*
• Name: ${this.escapeMarkdown(data.name)}
• Phone: ${this.escapeMarkdown(data.contact)}

⭐ *LEAD QUALIFICATION*
• Lead Status: ${leadStatus} ${leadStatus === 'HOT' ? '🔥' : leadStatus === 'WARM' ? '🟠' : '🔵'}
• Score: ${leadScore}/100
• Buyer Type: ${buyerType}
• Priority: ${leadStatus === 'HOT' ? '🔴 URGENT' : leadStatus === 'WARM' ? '🟠 HIGH' : '🟡 MEDIUM'}

🏠 *PROPERTY NEEDS*
• Purpose: ${data.purpose || 'Not specified'}
• Location: ${data.location || 'Not specified'}
• TCP Budget: ${data.tcp || 'Not specified'}
• Monthly Budget: ${data.monthly || 'Not specified'}

💰 *FINANCIAL PROFILE*
• Monthly Income: ${data.income || 'Not specified'}
• Income Source: ${data.source || 'Not specified'}
• Financing: ${data.financing || 'Not specified'}

📅 *BUYING DETAILS*
• Timeline: ${data.timeline || 'Not specified'}
• Site Visit: ${data.visit || 'Not specified'}
• Decision Maker: ${data.decision || 'Not specified'}

⚡ *RECOMMENDED ACTION*
${recommendedAction}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
Received: ${timestamp}
        `;

        return message;
    }

    escapeMarkdown(text) {
        if (!text) return '';
        return text.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&');
    }

    async sendMessage(message) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                chat_id: this.chatId,
                text: message,
                parse_mode: 'MarkdownV2'
            });

            const options = {
                hostname: 'api.telegram.org',
                path: `/bot${this.botToken}/sendMessage`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                timeout: 10000
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error(`Telegram API error: ${res.statusCode}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.abort();
                reject(new Error('Request timeout'));
            });
            req.write(postData);
            req.end();
        });
    }
}

const submittedLeads = new Set();

function isDuplicate(name, contact) {
    const key = `${name.toLowerCase()}|${contact}`;
    if (submittedLeads.has(key)) {
        return true;
    }
    submittedLeads.add(key);
    return false;
}

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'OK' })
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId) {
            console.error('Missing environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        const data = JSON.parse(event.body);

        if (!data.name || !data.contact) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Name and contact are required' })
            };
        }

        if (isDuplicate(data.name, data.contact)) {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({ error: 'This lead appears to have been already submitted' })
            };
        }

        const engine = new LeadScoringEngine();
        const { score: leadScore, factors } = engine.scoreLeadQuality(data);
        const leadStatus = engine.getLeadStatus(leadScore, data.timeline);
        const buyerType = engine.getBuyerType(data);
        const recommendedAction = engine.getRecommendedAction(leadStatus, leadScore, data.timeline);

        const bot = new TelegramBot(botToken, chatId);
        const message = bot.formatMessage(data, leadScore, leadStatus, buyerType, recommendedAction);
        
        await bot.sendMessage(message);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'Thank you for submitting. Our property consultant will contact you shortly.',
                success: true
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to process submission' })
        };
    }
};
