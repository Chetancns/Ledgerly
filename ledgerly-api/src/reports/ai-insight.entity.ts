import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('dbo.ai_insights')
export class AiInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  periodStart: string; // YYYY-MM-DD

  @Column()
  periodEnd: string; // YYYY-MM-DD

  @Column('text')
  fullAnalysis: string;

  @Column('jsonb', { nullable: true })
  sections: {
    healthAssessment: string;
    keyObservations: string[];
    recommendations: string[];
    budgetSuggestions: string[];
    predictions: string;
  };

  @Column('jsonb', { nullable: true })
  insightsSnapshot: any; // Store the insights data used for generation

  @CreateDateColumn()
  createdAt: Date;
}
