// reports.controller.ts
import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import express from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../common/decorators/user.decorator'

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('budget-vs-actual')
  async budgetVsActual(
    @GetUser() user: { userId: string },
    @Query('period') period:'monthly' | 'weekly' | 'bi-weekly' | 'yearly',
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.reportsService.budgetVsActual(user.userId, period, month, year);
  }

   @Get('cashflow')
  async getCashflow(
    @GetUser() user: { userId: string },
    @Query('period') period:'daily'|'monthly' | 'weekly' | 'bi-weekly' | 'yearly',
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.reportsService.getCashflowTimeline(user.userId,period, month, year);
  }
  @Get('category-heatmap')
  async getCategoryHeatmap(
    @GetUser() user: { userId: string },
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.reportsService.getCategoryHeatmap(user.userId,month, year);
  }

  @Get('export-transactions')
  async exportTransactions(
    @GetUser() user: { userId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format: 'csv' | 'json' = 'csv',
    @Res() res?: express.Response,
  ) {
    const data = await this.reportsService.exportTransactions(user.userId, { from, to, format });
    
    if (format === 'csv' && res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions-${from || 'all'}-${to || 'all'}.csv"`);
      return res.send(data);
    }
    
    return data;
  }

  @Get('spending-insights')
  async getSpendingInsights(
    @GetUser() user: { userId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('compareWithPrevious') compareWithPrevious?: string,
  ) {
    return this.reportsService.getSpendingInsights(user.userId, {
      from,
      to,
      compareWithPrevious: compareWithPrevious === 'true',
    });
  }

  @Get('ai-insights')
  async getAIInsights(
    @GetUser() user: { userId: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('compareWithPrevious') compareWithPrevious?: string,
    @Query('forceNew') forceNew?: string,
  ) {
    // Check if we have stored insights first
    if (forceNew !== 'true' && from && to) {
      const stored = await this.reportsService.getStoredAIInsights(user.userId, from, to);
      if (stored) {
        // Also return usage so frontend can update counters
        const month = from ? from.split('-')[1] : (new Date().getMonth() + 1).toString();
        const year = from ? from.split('-')[0] : new Date().getFullYear().toString();
        const usage = await this.reportsService.getMonthlyAIUsage(user.userId, month, year);
        const insightsData = await this.reportsService.getSpendingInsights(user.userId, {
          from,
          to,
          compareWithPrevious: compareWithPrevious === 'true',
        });
        
        return {
          insights: insightsData,
          aiAnalysis: stored,
          usage,
        };
      }
    }

    // Get monthly usage for the selected period
    const month = from ? from.split('-')[1] : (new Date().getMonth() + 1).toString();
    const year = from ? from.split('-')[0] : new Date().getFullYear().toString();
    const usage = await this.reportsService.getMonthlyAIUsage(user.userId, month, year);

    // First get the spending insights data
    const insightsData = await this.reportsService.getSpendingInsights(user.userId, {
      from,
      to,
      compareWithPrevious: compareWithPrevious === 'true',
    });

    // Then generate AI analysis (will use cache or check limits)
    const aiAnalysis = await this.reportsService.generateAIInsights(
      user.userId, 
      insightsData,
      forceNew === 'true'
    );

    return {
      insights: insightsData,
      aiAnalysis,
      usage,
    };
  }

  @Get('ai-usage')
  async getAIUsage(
    @GetUser() user: { userId: string },
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const currentMonth = month || (new Date().getMonth() + 1).toString();
    const currentYear = year || new Date().getFullYear().toString();
    
    return this.reportsService.getMonthlyAIUsage(user.userId, currentMonth, currentYear);
  }

  @Get('ai-insights/history')
  async getAIInsightsHistory(
    @GetUser() user: { userId: string },
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const currentMonth = month || (new Date().getMonth() + 1).toString();
    const currentYear = year || new Date().getFullYear().toString();
    return this.reportsService.listStoredAIInsights(user.userId, currentMonth, currentYear);
  }

  @Get('ai-insights/by-id')
  async getAIInsightById(
    @GetUser() user: { userId: string },
    @Query('id') id: string,
  ) {
    return this.reportsService.getAIInsightById(user.userId, id);
  }

}
