import { chromium, Browser, Page } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class BrowserAutomationService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private genAI: GoogleGenerativeAI;
  static instance: BrowserAutomationService | null = null;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  // Singleton pattern to maintain browser instance
  static async getInstance() {
    if (!BrowserAutomationService.instance) {
      BrowserAutomationService.instance = new BrowserAutomationService();
    }
    return BrowserAutomationService.instance;
  }

  async init() {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      this.page = await this.browser.newPage();
      return true;
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      return false;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  private async analyzeWithGemini(instruction: string, screenshot: Buffer | null = null) {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
      You are an expert in web automation. Analyze this user instruction and create a detailed plan of actions.
      User wants to: "${instruction}"

      Create a sequence of specific actions that will accomplish this task.
      Consider common website layouts and elements.

      For example, if the task involves Amazon:
      1. Search functionality uses input[name='field-keywords']
      2. Add to cart button usually has id="add-to-cart-button"
      3. Search results often have class="s-result-item"

      For YouTube:
      1. Search bar has id="search" or name="search_query"
      2. Video titles are in "ytd-video-renderer"
      3. Consider using text content for finding specific videos

      Return ONLY a JSON array of actions. Include waits between important steps.
      Example format:
      [
        {"type": "navigate", "data": {"url": "https://www.amazon.com"}},
        {"type": "wait", "data": {"milliseconds": 2000}},
        {"type": "type", "data": {"selector": "input[name='field-keywords']", "text": "search term"}},
        {"type": "click", "data": {"selector": "input[type='submit']"}},
        {"type": "waitForSelector", "data": {"selector": ".s-result-item"}},
        {"type": "evaluateAndClick", "data": {"text": "specific product name"}}
      ]
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log('Gemini response:', text);

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('No valid action plan generated');
    } catch (error) {
        console.error('Gemini analysis error:', error);
        throw error;
    }
  }

  private async executeActions(actions: any[]) {
    if (!this.page) throw new Error('Browser page not initialized');

    for (const action of actions) {
        console.log('Executing action:', action);
        
        try {
            switch (action.type) {
                case 'navigate':
                    await Promise.race([
                        this.page.goto(action.data.url, {
                            waitUntil: 'domcontentloaded',
                            timeout: 15000
                        }),
                        new Promise(resolve => setTimeout(resolve, 15000))
                    ]);
                    await this.page.waitForLoadState('load').catch(() => {});
                    break;

                case 'click':
                    await this.page.waitForSelector(action.data.selector, { 
                        timeout: 10000,
                        state: 'visible'
                    });
                    await this.page.click(action.data.selector);
                    break;

                case 'type':
                    await this.page.waitForSelector(action.data.selector, { 
                        timeout: 10000,
                        state: 'visible'
                    });
                    await this.page.type(action.data.selector, action.data.text);
                    await this.page.keyboard.press('Enter');
                    break;

                case 'waitForSelector':
                    await this.page.waitForSelector(action.data.selector, {
                        timeout: 10000,
                        state: 'visible'
                    });
                    break;

                case 'evaluateAndClick':
                    // Smart element finding based on text content
                    await this.page.evaluate((text) => {
                        const elements = Array.from(document.querySelectorAll('*'));
                        const element = elements.find(el => 
                            el.textContent?.toLowerCase().includes(text.toLowerCase())
                        );
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            element.click();
                        }
                    }, action.data.text);
                    break;

                case 'wait':
                    await this.page.waitForTimeout(action.data.milliseconds);
                    break;

                case 'scroll':
                    await this.page.evaluate((amount) => {
                        window.scrollBy(0, amount);
                    }, action.data.amount);
                    break;
            }
            
            // Wait between actions
            await this.page.waitForTimeout(1000);
            
        } catch (error) {
            console.error(`Error executing action ${action.type}:`, error);
            // Continue with next action instead of throwing
        }
    }
  }

  async processInstruction(instruction: string) {
    try {
      console.log('Processing instruction:', instruction);
      
      // Get actions from Gemini
      const actions = await this.analyzeWithGemini(instruction);
      console.log('Planned actions:', actions);

      // Execute actions
      await this.executeActions(actions);

      return { 
        success: true, 
        message: 'Actions executed successfully. Browser remains open for further instructions.' 
      };
    } catch (error) {
      console.error('Error processing instruction:', error);
      throw error;
    }
  }

  // Remove automatic cleanup
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      BrowserAutomationService.instance = null;
    }
  }
} 