import { z } from 'zod';

// Player join validation
export const JoinTableSchema = z.object({
  tableId: z.string().min(1).max(100),
  name: z.string().min(2).max(20).regex(/^[a-zA-Z0-9_\-\s]+$/),
});

export type JoinTableData = z.infer<typeof JoinTableSchema>;

// Player leave validation
export const LeaveTableSchema = z.object({
  tableId: z.string().min(1).max(100),
});

export type LeaveTableData = z.infer<typeof LeaveTableSchema>;

// Betting actions validation
export const BetActionSchema = z.object({
  amount: z.number().int().min(1).max(1000000),
});

export const RaiseActionSchema = z.object({
  amount: z.number().int().min(1).max(1000000),
});

export const CallActionSchema = z.object({});

export const CheckActionSchema = z.object({});

export const FoldActionSchema = z.object({});

export type BetActionData = z.infer<typeof BetActionSchema>;
export type RaiseActionData = z.infer<typeof RaiseActionSchema>;
export type CallActionData = z.infer<typeof CallActionSchema>;
export type CheckActionData = z.infer<typeof CheckActionSchema>;
export type FoldActionData = z.infer<typeof FoldActionSchema>;

// Chat message validation
export const ChatMessageSchema = z.object({
  message: z.string().min(1).max(200).trim(),
});

export type ChatMessageData = z.infer<typeof ChatMessageSchema>;

// Validation helper function
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: true; 
  data: T; 
} | { 
  success: false; 
  error: string; 
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: message };
    }
    return { success: false, error: 'Invalid data format' };
  }
}

// Socket event validation middleware
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown, callback: (result: { success: true; data: T } | { success: false; error: string }) => void) => {
    const result = validateData(schema, data);
    callback(result);
  };
}
