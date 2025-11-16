import { sql } from "drizzle-orm";
import { pgTable, text, varchar, numeric, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username").notNull(),
  availableBalance: numeric("available_balance", { precision: 18, scale: 8 }).notNull().default("0"),
  frozenBalance: numeric("frozen_balance", { precision: 18, scale: 8 }).notNull().default("0"),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});

export const paymentRequests = pgTable("payment_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amountRub: numeric("amount_rub", { precision: 18, scale: 2 }).notNull(),
  amountUsdt: numeric("amount_usdt", { precision: 18, scale: 8 }).notNull(),
  frozenRate: numeric("frozen_rate", { precision: 18, scale: 2 }).notNull(),
  urgency: text("urgency").notNull(),
  hasUrgentFee: integer("has_urgent_fee").notNull().default(0),
  attachments: jsonb("attachments"),
  comment: text("comment"),
  status: text("status").notNull().default("submitted"),
  receipt: jsonb("receipt"),
  adminComment: text("admin_comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  requestId: varchar("request_id"),
  message: text("message").notNull(),
  isRead: integer("is_read").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deposits = pgTable("deposits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  requestedAmount: numeric("requested_amount", { precision: 18, scale: 4 }),
  payableAmount: numeric("payable_amount", { precision: 18, scale: 4 }),
  walletAddress: text("wallet_address"),
  expiresAt: timestamp("expires_at"),
  status: text("status").notNull().default("pending"),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  confirmedBy: varchar("confirmed_by"),
});

export const operators = pgTable("operators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  login: text("login").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  salt: varchar("salt", { length: 64 }).notNull(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tronScanState = pgTable("tron_scan_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lastProcessedBlockNumber: text("last_processed_block_number").notNull().default("0"),
  lastProcessedTimestamp: timestamp("last_processed_timestamp").notNull().defaultNow(),
  lastSuccessfulScan: timestamp("last_successful_scan").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  registeredAt: true,
});

export const insertPaymentRequestSchema = createInsertSchema(paymentRequests).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertDepositSchema = createInsertSchema(deposits).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
  confirmedBy: true,
});

export const insertTronScanStateSchema = createInsertSchema(tronScanState).omit({
  id: true,
  lastProcessedTimestamp: true,
  lastSuccessfulScan: true,
  updatedAt: true,
});

export const insertOperatorSchema = createInsertSchema(operators).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPaymentRequest = z.infer<typeof insertPaymentRequestSchema>;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Deposit = typeof deposits.$inferSelect;
export type InsertOperator = z.infer<typeof insertOperatorSchema>;
export type Operator = typeof operators.$inferSelect;
export type InsertTronScanState = z.infer<typeof insertTronScanStateSchema>;
export type TronScanState = typeof tronScanState.$inferSelect;

export type Attachment = {
  type: 'image' | 'link' | 'pdf' | 'doc' | 'docx';
  value: string;
  name?: string;
};
