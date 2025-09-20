/**
 * Subscription Service
 * Manages PRO subscription status for users
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface SubscriptionStatus {
  isPro: boolean;
  subscriptionId?: string;
  planType?: string;
  expiresAt?: Date;
  autoRenew?: boolean;
}

export class SubscriptionService {
  /**
   * Check if a user has an active PRO subscription
   */
  static async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      console.log('Fetching subscription status via API for user:', userId);

      const response = await fetch('/api/subscription', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API error fetching subscription status:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error
        });
        return { isPro: false };
      }

      console.log('Successfully fetched subscription status via API:', result);
      return result.data;
    } catch (error) {
      console.error('Exception in getSubscriptionStatus:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return { isPro: false };
    }
  }

  /**
   * Update a user's PRO subscription status
   */
  static async updateSubscriptionStatus(
    userId: string,
    isPro: boolean,
    subscriptionId?: string,
    planType?: string,
    expiresAt?: Date,
    autoRenew?: boolean
  ): Promise<boolean> {
    try {
      const requestData = {
        isPro,
        subscriptionId,
        planType,
        expiresAt: expiresAt?.toISOString(),
        autoRenew
      };

      console.log('Updating subscription status via API for user:', userId, 'with data:', requestData);

      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('API error updating subscription status:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error
        });
        return false;
      }

      console.log('Successfully updated subscription status via API:', result);
      return true;
    } catch (error) {
      console.error('Exception in updateSubscriptionStatus:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Check if a user is PRO (convenience method)
   */
  static async isUserPro(userId: string): Promise<boolean> {
    const status = await this.getSubscriptionStatus(userId);
    return status.isPro;
  }

  /**
   * Grant PRO status to a user (for testing/admin purposes)
   */
  static async grantProStatus(userId: string): Promise<boolean> {
    return this.updateSubscriptionStatus(userId, true);
  }

  /**
   * Revoke PRO status from a user
   */
  static async revokeProStatus(userId: string): Promise<boolean> {
    return this.updateSubscriptionStatus(userId, false);
  }

  /**
   * Get all PRO users (admin function)
   */
  static async getAllProUsers(): Promise<any[]> {
    try {
      console.log('Fetching all PRO users via API');

      // For admin functions, we'll still use direct Supabase client
      // since this is typically called from server-side admin contexts
      const { data, error } = await supabase
        .from('profiles')
        .select('id, clerk_id, username, display_name, email, is_pro, created_at, updated_at')
        .eq('is_pro', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching PRO users:', error);
        return [];
      }

      console.log(`Successfully fetched ${data?.length || 0} PRO users`);
      return data || [];
    } catch (error) {
      console.error('Error in getAllProUsers:', error);
      return [];
    }
  }
}
