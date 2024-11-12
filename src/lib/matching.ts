interface MatchAnalysis {
  totalScore: number;
  categoryScores: Array<{
    category: string;
    score: number;
    details: string[];
  }>;
  sharedInterests: string[];
  compatibilityInsights: string[];
}

export function generateMatchSummaryEmail(
  name: string,
  analysis: any,
  matches: Array<{ user: any; analysis: MatchAnalysis }>
) {
  const matchesHtml = matches.map(match => `
    <div style="margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
      <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 10px;">
        <h3 style="margin: 0; color: #1f2937; font-size: 18px;">${match.user.name}</h3>
        <p style="margin: 5px 0; color: #6b7280;">${match.user.currentRole} at ${match.user.professionalField}</p>
      </div>
      
      <div style="margin: 15px 0;">
        <p style="margin: 0; color: #1f2937;"><strong>Match Strength:</strong></p>
        <div style="background-color: #f3f4f6; border-radius: 4px; padding: 10px; margin-top: 5px;">
          ${match.analysis.categoryScores.map(category => `
            <div style="margin: 5px 0;">
              <span style="color: #4b5563;">${category.category}:</span>
              <div style="width: 100%; background-color: #e5e7eb; height: 8px; border-radius: 4px; margin-top: 2px;">
                <div style="width: ${Math.round(category.score * 100)}%; background-color: #3b82f6; height: 100%; border-radius: 4px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin: 15px 0;">
        <p style="margin: 0; color: #1f2937;"><strong>Why You Match:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px; color: #4b5563;">
          ${match.analysis.compatibilityInsights.map(insight => `
            <li style="margin: 5px 0;">${insight}</li>
          `).join('')}
        </ul>
      </div>

      <div style="margin: 15px 0;">
        <p style="margin: 0; color: #1f2937;"><strong>Shared Interests:</strong></p>
        <div style="margin-top: 5px;">
          ${match.analysis.sharedInterests.map(interest => `
            <span style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 9999px; font-size: 12px; margin: 2px;">${interest}</span>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <h2 style="color: #1f2937; text-align: center; margin-bottom: 30px;">Your AI Networking Matches</h2>
      
      <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: