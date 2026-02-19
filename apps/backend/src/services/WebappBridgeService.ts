import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Business } from '../models/Business.js';

interface FindOrCreateInfo {
  webappUserId: string;
  email: string;
  name?: string;
  businessName?: string;
}

interface FindOrCreateResult {
  userId: string;
  businessId: string;
  isNew: boolean;
}

export class WebappBridgeService {
  /**
   * Finds an existing review-backend user by email, or creates a new
   * Business + User pair for a webapp user bridging into the review system.
   */
  static async findOrCreateReviewUser(
    info: FindOrCreateInfo
  ): Promise<FindOrCreateResult> {
    const email = info.email.toLowerCase().trim();

    // Check for existing user by email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return {
        userId: existingUser._id.toString(),
        businessId: existingUser.businessId.toString(),
        isNew: false,
      };
    }

    // Create new Business
    const business = await Business.create({
      name: info.businessName || info.name || email,
      email,
      metadata: { source: 'webapp', webappUserId: info.webappUserId },
    });

    // Generate a random uncrackable password hash (satisfies required field)
    const randomPassword = crypto.randomBytes(64).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    // Create new User as admin of their business
    const user = await User.create({
      businessId: business._id,
      email,
      passwordHash,
      ...(info.name ? { name: info.name } : {}),
      role: 'admin',
    });

    return {
      userId: user._id.toString(),
      businessId: business._id.toString(),
      isNew: true,
    };
  }
}
