import { z } from 'zod';

export const TimeBlockSchema = z.object({
  _id: z.string().uuid(),
  title: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  priority: z.enum(['urgent-important', 'important', 'urgent', 'neither']),
  delegatable: z.boolean(),
  maxBudget: z.number().optional(),
  service: z.string().optional(),
  delegatedTo: z.string().optional(),
  status: z.enum(['scheduled', 'delegated', 'completed', 'cancelled']).default('scheduled'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CalendarPresetSchema = z.object({
  timeBlocks: z.array(TimeBlockSchema),
  hourlyRate: z.number(),
  delegationServices: z.array(z.object({
    _id: z.string().uuid(),
    service: z.string(),
    username: z.string(),
    credentials: z.string(), // encrypted
    registered_at: z.string().datetime(),
  })),
});

export type TimeBlockType = z.infer<typeof TimeBlockSchema>;
export type CalendarPresetType = z.infer<typeof CalendarPresetSchema>; 