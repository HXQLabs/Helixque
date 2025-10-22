import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ReportDoc extends Document {
  reporterId: string;
  reportedId: string;
  roomId: string;
  reason?: string;
  ts: number;
  reporterMeta?: Record<string, unknown>;
  reportedMeta?: Record<string, unknown>;
}

const ReportSchema = new Schema<ReportDoc>({
  reporterId: { type: String, required: true, index: true },
  reportedId: { type: String, required: true, index: true },
  roomId: { type: String, required: true, index: true },
  reason: { type: String },
  ts: { type: Number, required: true, index: true },
  reporterMeta: { type: Schema.Types.Mixed },
  reportedMeta: { type: Schema.Types.Mixed },
});

export const Report: Model<ReportDoc> =
  (mongoose.models.Report as Model<ReportDoc>) ||
  mongoose.model<ReportDoc>("Report", ReportSchema);


