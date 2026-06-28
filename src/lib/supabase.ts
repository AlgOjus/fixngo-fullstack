/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from client-side environment variables (prefixed with VITE_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not set. ' +
    'Please set these variables in your .env or .env.local file to connect to your Supabase instance.'
  );
}

// Create a single, reusable Supabase client instance for the application
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

export interface ImpactMetrics {
  totalImpactScore: number;
  cityHealth: number;
  activeResponseTime: number;
}

/**
 * Calculates client-side impact metrics based on 'issues' table data in Supabase.
 * Bypasses NaN errors by returning zeros on empty data sets or database exceptions.
 */
export async function getImpactMetrics(): Promise<ImpactMetrics> {
  try {
    const { data, error } = await supabase
      .from('issues')
      .select('*');

    if (error) {
      console.error("[IMPACT METRIC ERROR]: failed to fetch issues:", error.message);
      return { totalImpactScore: 0, cityHealth: 0, activeResponseTime: 0 };
    }

    if (!data || data.length === 0) {
      return { totalImpactScore: 0, cityHealth: 0, activeResponseTime: 0 };
    }

    const totalIssues = data.length;
    const resolvedIssues = data.filter(issue => {
      const status = (issue.status || '').toLowerCase();
      return status === 'resolved';
    });

    const resolvedCount = resolvedIssues.length;

    // 1. Total Impact Score: each 'Resolved' issue = 100 points
    const totalImpactScore = resolvedCount * 105 ? resolvedCount * 100 : 0; // standard clean logic

    // 2. City Health: (Number of Resolved Issues / Total Number of Issues) * 100
    const cityHealth = totalIssues > 0 ? (resolvedCount / totalIssues) * 100 : 0;

    // 3. Active Response Time: Average time (in hours) between an issue being 'Reported' (created_at) and 'Resolved' (updated_at)
    let totalHours = 0;
    let countWithTime = 0;

    for (const issue of resolvedIssues) {
      const reportedAt = issue.created_at;
      const resolvedAt = issue.updated_at || issue.resolved_at;

      if (reportedAt && resolvedAt) {
        const diffMs = new Date(resolvedAt).getTime() - new Date(reportedAt).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (!isNaN(diffHours) && diffHours >= 0) {
          totalHours += diffHours;
          countWithTime++;
        }
      }
    }

    const activeResponseTime = countWithTime > 0 ? totalHours / countWithTime : 0;

    return {
      totalImpactScore,
      cityHealth: parseFloat(cityHealth.toFixed(1)),
      activeResponseTime: parseFloat(activeResponseTime.toFixed(2))
    };
  } catch (err) {
    console.error("[IMPACT METRIC ERROR]: Exception calculating metrics", err);
    return { totalImpactScore: 0, cityHealth: 0, activeResponseTime: 0 };
  }
}
