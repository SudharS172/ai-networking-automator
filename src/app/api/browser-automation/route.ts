import { BrowserAutomationService } from '@/lib/browserAutomation';

export async function GET(req: Request) {
  const automationService = new BrowserAutomationService();
  try {
    const models = await automationService.listAvailableModels();
    return Response.json({ success: true, models });
  } catch (error) {
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
    const { instruction } = await req.json();
    
    if (!instruction) {
        return Response.json({ 
            success: false, 
            error: 'Instruction is required' 
        }, { status: 400 });
    }

    try {
        // Get singleton instance
        const automationService = await BrowserAutomationService.getInstance();
        await automationService.initialize();
        
        const result = await automationService.processInstruction(instruction);
        
        // Don't cleanup - keep browser open
        return Response.json({
            success: true,
            result,
            message: 'Actions completed successfully. Browser remains open.'
        });
    } catch (error) {
        console.error('Automation error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
} 