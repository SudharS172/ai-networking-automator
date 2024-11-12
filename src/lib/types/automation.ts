export type ActionType = 
  | 'navigate' 
  | 'click' 
  | 'type' 
  | 'scroll' 
  | 'wait'
  | 'hover'
  | 'dragAndDrop'
  | 'select'
  | 'screenshot'
  | 'pressKey'
  | 'rightClick'
  | 'doubleClick'
  | 'focus'
  | 'fileUpload';

export interface BrowserAction {
  type: ActionType;
  data: any;
  description?: string;
}

export interface AutomationResult {
  success: boolean;
  screenshots?: string[];
  actions: BrowserAction[];
  error?: string;
} 