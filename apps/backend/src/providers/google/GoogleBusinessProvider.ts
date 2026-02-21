import type {
  GoogleLocation,
  GoogleLocationFromAPI,
  GoogleReviewFromAPI,
  ReviewRating,
} from '@easyrate/shared';

const GOOGLE_MY_BUSINESS_API = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const GOOGLE_MY_BUSINESS_ACCOUNT_API = 'https://mybusinessaccountmanagement.googleapis.com/v1';

// Google star rating to number mapping
const STAR_RATING_MAP: Record<string, ReviewRating> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export interface GoogleReview {
  externalId: string;
  reviewerName: string;
  reviewerPhotoUrl?: string;
  rating: ReviewRating;
  reviewText?: string;
  reviewedAt: Date;
  reply?: {
    text: string;
    repliedAt: Date;
  };
  resourceName: string;
}

export interface GoogleReviewsResponse {
  reviews: GoogleReview[];
  nextPageToken?: string;
  totalCount: number;
}

export interface GoogleAccount {
  id: string;
  name: string;
  accountName: string;
}

/**
 * Provider for Google Business Profile API
 * Handles fetching locations, reviews, and posting replies
 */
export class GoogleBusinessProvider {
  private log(message: string, data?: Record<string, unknown>): void {
    const prefix = '[GOOGLE_BUSINESS]';
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }

  private logError(message: string, error: unknown): void {
    const prefix = '[GOOGLE_BUSINESS]';
    console.error(prefix, message, error);
  }

  /**
   * Get all accounts for the authenticated user
   */
  async getAccounts(accessToken: string): Promise<GoogleAccount[]> {
    try {
      const response = await fetch(`${GOOGLE_MY_BUSINESS_ACCOUNT_API}/accounts`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        this.logError('Failed to fetch accounts', error);
        throw new Error(`Failed to fetch Google accounts: ${String(response.status)}`);
      }

      const data = (await response.json()) as {
        accounts?: { name: string; accountName: string }[];
      };

      return (data.accounts ?? []).map((account) => ({
        id: account.name.replace('accounts/', ''),
        name: account.name,
        accountName: account.accountName,
      }));
    } catch (error) {
      this.logError('Error fetching accounts', error);
      throw error;
    }
  }

  /**
   * Get all locations for a Google Business account
   */
  async getLocations(accessToken: string, accountId?: string): Promise<GoogleLocation[]> {
    try {
      const accounts = await this.getAccounts(accessToken);
      if (accounts.length === 0) {
        this.log('No Google Business accounts found');
        return [];
      }

      // If accountId provided, only fetch locations for that account
      // Otherwise, fetch locations for ALL accounts
      const accountsToQuery = accountId
        ? accounts.filter((a) => a.id === accountId || a.name === accountId)
        : accounts;

      if (accountsToQuery.length === 0) {
        this.log('Specified account not found', { accountId });
        return [];
      }

      const allLocations: GoogleLocation[] = [];

      for (const account of accountsToQuery) {
        const accountName = account.name.startsWith('accounts/')
          ? account.name
          : `accounts/${account.name}`;
        try {
          const response = await fetch(
            `${GOOGLE_MY_BUSINESS_API}/${accountName}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,metadata`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!response.ok) {
            const error = await response.json();
            this.logError(`Failed to fetch locations for account ${accountName}`, error);
            continue; // Skip this account, try the rest
          }

          const data = (await response.json()) as { locations?: GoogleLocationFromAPI[] };
          const locations = (data.locations ?? []).map((location) =>
            this.transformLocation(location, accountName)
          );
          allLocations.push(...locations);
        } catch (error) {
          this.logError(`Error fetching locations for account ${accountName}`, error);
          // Continue with other accounts
        }
      }

      return allLocations;
    } catch (error) {
      this.logError('Error fetching locations', error);
      throw error;
    }
  }

  /**
   * Get reviews for a specific location
   */
  async getReviews(
    accessToken: string,
    locationName: string,
    pageToken?: string,
    pageSize = 50
  ): Promise<GoogleReviewsResponse> {
    try {
      // Use the correct API endpoint for reviews
      const reviewsApiUrl = 'https://mybusiness.googleapis.com/v4';

      const params = new URLSearchParams({
        pageSize: String(Math.min(pageSize, 50)), // Google max is 50
      });
      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const response = await fetch(
        `${reviewsApiUrl}/${locationName}/reviews?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        this.logError('Failed to fetch reviews', error);
        throw new Error(`Failed to fetch reviews: ${String(response.status)}`);
      }

      const data = (await response.json()) as {
        reviews?: GoogleReviewFromAPI[];
        nextPageToken?: string;
        totalReviewCount?: number;
      };

      const result: GoogleReviewsResponse = {
        reviews: (data.reviews ?? []).map((review) => this.transformReview(review)),
        totalCount: data.totalReviewCount ?? 0,
      };
      if (data.nextPageToken) {
        result.nextPageToken = data.nextPageToken;
      }
      return result;
    } catch (error) {
      this.logError('Error fetching reviews', error);
      throw error;
    }
  }

  /**
   * Get all reviews for a location (handles pagination)
   */
  async getAllReviews(accessToken: string, locationName: string): Promise<GoogleReview[]> {
    const allReviews: GoogleReview[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.getReviews(accessToken, locationName, pageToken);
      allReviews.push(...response.reviews);
      pageToken = response.nextPageToken;
    } while (pageToken);

    return allReviews;
  }

  /**
   * Reply to a review on Google
   * Note: Google replies cannot be edited after posting
   */
  async replyToReview(
    accessToken: string,
    reviewName: string,
    replyText: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const reviewsApiUrl = 'https://mybusiness.googleapis.com/v4';

      const response = await fetch(`${reviewsApiUrl}/${reviewName}/reply`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: replyText,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        this.logError('Failed to post reply', error);
        return {
          success: false,
          error: `Failed to post reply: ${String(response.status)}`,
        };
      }

      this.log('Reply posted successfully', { reviewName });
      return { success: true };
    } catch (error) {
      this.logError('Error posting reply', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a reply from a review
   * Note: Only the business owner can delete their own replies
   */
  async deleteReply(
    accessToken: string,
    reviewName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const reviewsApiUrl = 'https://mybusiness.googleapis.com/v4';

      const response = await fetch(`${reviewsApiUrl}/${reviewName}/reply`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        this.logError('Failed to delete reply', error);
        return {
          success: false,
          error: `Failed to delete reply: ${String(response.status)}`,
        };
      }

      this.log('Reply deleted successfully', { reviewName });
      return { success: true };
    } catch (error) {
      this.logError('Error deleting reply', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Transform Google API location to our format
   */
  private transformLocation(location: GoogleLocationFromAPI, accountName?: string): GoogleLocation {
    const addressLines = location.address?.addressLines ?? [];
    const address = [...addressLines, location.address?.locality, location.address?.postalCode]
      .filter(Boolean)
      .join(', ');

    // v1 API returns name as "locations/{id}" (no account prefix).
    // v4 reviews API needs "accounts/{accountId}/locations/{id}".
    // Prepend account so stored locationIds work with the v4 reviews endpoint.
    const fullPath = accountName ? `${accountName}/${location.name}` : location.name;

    const result: GoogleLocation = {
      id: fullPath,
      name: location.title,
    };
    if (address) {
      result.address = address;
    }
    if (location.primaryPhone) {
      result.primaryPhone = location.primaryPhone;
    }
    if (location.websiteUri) {
      result.websiteUrl = location.websiteUri;
    }
    if (location.metadata?.placeId) {
      result.placeId = location.metadata.placeId;
    }
    return result;
  }

  /**
   * Transform Google API review to our format
   */
  private transformReview(review: GoogleReviewFromAPI): GoogleReview {
    const result: GoogleReview = {
      externalId: review.reviewId,
      reviewerName: review.reviewer.displayName,
      rating: STAR_RATING_MAP[review.starRating] ?? 3,
      reviewedAt: new Date(review.createTime),
      resourceName: review.name,
    };
    if (review.reviewer.profilePhotoUrl) {
      result.reviewerPhotoUrl = review.reviewer.profilePhotoUrl;
    }
    if (review.comment) {
      result.reviewText = review.comment;
    }
    if (review.reviewReply) {
      result.reply = {
        text: review.reviewReply.comment,
        repliedAt: new Date(review.reviewReply.updateTime),
      };
    }
    return result;
  }
}

export const googleBusinessProvider = new GoogleBusinessProvider();
