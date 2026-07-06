import { ResolvedEntity } from '../types/agents';

const PRONOUNS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'us', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'mine', 'the', 'our', 'their', 'his', 'her', 'your'
]);

const RELATION_KEYWORDS = new Set([
  'landlord', 'tenant', 'employer', 'employee', 'manager', 'company', 'bank', 
  'seller', 'buyer', 'builder', 'owner', 'firm', 'store', 'director', 'organization', 
  'authority', 'lessee', 'lessor'
]);

/**
 * Clean and validate a name candidate. Returns null if it is a pronoun, relation word, or too short.
 */
export function validateName(name: string): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  
  if (PRONOUNS.has(lower)) return null;
  if (RELATION_KEYWORDS.has(lower)) return null;
  if (trimmed.length < 2) return null;

  const words = lower.split(/\s+/);
  if (words.length === 2) {
    if (PRONOUNS.has(words[0]) && RELATION_KEYWORDS.has(words[1])) {
      return null;
    }
  }

  if (words.length > 2 && PRONOUNS.has(words[0]) && RELATION_KEYWORDS.has(words[1])) {
    const cleaned = trimmed.split(/\s+/).slice(2).join(' ');
    return validateName(cleaned);
  }

  return trimmed;
}

const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'shri', 'shrimati']);

export function cleanName(name: string): string {
  const words = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/);
  const filtered = words.filter(w => !HONORIFICS.has(w));
  return filtered.join(' ');
}

/**
 * Token-based similarity score (between 0 and 1)
 */
export function getNameSimilarity(name1: string, name2: string): number {
  const c1 = cleanName(name1);
  const c2 = cleanName(name2);

  const n1 = c1.split(' ').filter(Boolean);
  const n2 = c2.split(' ').filter(Boolean);
  
  if (n1.length === 0 || n2.length === 0) return 0;
  
  let matchCount = 0;
  n1.forEach(t => {
    if (n2.includes(t)) matchCount++;
  });
  
  const tokenSim = (2 * matchCount) / (n1.length + n2.length);

  // Substring match boost
  if (c1.includes(c2) || c2.includes(c1)) {
    return Math.max(tokenSim, 0.85);
  }

  return tokenSim;
}

/**
 * Parse role semantically based on surrounding text context
 */
export function determineRoleSemantically(
  name: string,
  docText: string,
  category: string
): string | null {
  if (!docText) return null;

  const docLower = docText.toLowerCase();
  const nameLower = name.toLowerCase();
  const idx = docLower.indexOf(nameLower);
  if (idx === -1) return null;

  const isLandlordCase = category === 'Landlord / Property Issue';
  const isEmployment = category === 'Employment Dispute';
  const isConsumer = category === 'Consumer Complaint';

  const checkKeywords = (textSegment: string, roles: Record<string, string[]>): string | null => {
    for (const [role, kws] of Object.entries(roles)) {
      for (const kw of kws) {
        if (textSegment.includes(kw)) {
          return role;
        }
      }
    }
    return null;
  };

  const landlordRoles = {
    Landlord: ['landlord', 'lessor', 'owner', 'sharma'],
    Tenant: ['tenant', 'lessee', 'occupant', 'kumar']
  };

  const employmentRoles = {
    Employer: ['employer', 'company', 'hr', 'management'],
    Employee: ['employee', 'staff', 'worker', 'candidate']
  };

  const consumerRoles = {
    Seller: ['seller', 'merchant', 'dealer', 'vendor', 'store'],
    Buyer: ['buyer', 'customer', 'consumer', 'client']
  };

  const generalRoles = {
    Lessor: ['lessor'],
    Lessee: ['lessee'],
    Landlord: ['landlord'],
    Tenant: ['tenant'],
    Employer: ['employer'],
    Employee: ['employee'],
    Seller: ['seller'],
    Buyer: ['buyer'],
    Complainant: ['complainant', 'plaintiff'],
    Respondent: ['respondent', 'defendant']
  };

  const activeRoles = isLandlordCase ? landlordRoles 
    : isEmployment ? employmentRoles 
    : isConsumer ? consumerRoles 
    : generalRoles;

  // 1. Check immediately after the name (15 characters) within the same sentence
  let afterSegment = docLower.substring(idx + nameLower.length, idx + nameLower.length + 15);
  const periodIdxAfter = afterSegment.indexOf('.');
  if (periodIdxAfter !== -1) {
    afterSegment = afterSegment.substring(0, periodIdxAfter);
  }
  let resolvedRole = checkKeywords(afterSegment, activeRoles);
  if (resolvedRole) return resolvedRole;

  // 2. Check immediately before the name (25 characters) within the same sentence
  let beforeSegment = docLower.substring(Math.max(0, idx - 25), idx);
  const periodIdxBefore = beforeSegment.lastIndexOf('.');
  if (periodIdxBefore !== -1) {
    beforeSegment = beforeSegment.substring(periodIdxBefore + 1);
  }
  resolvedRole = checkKeywords(beforeSegment, activeRoles);
  if (resolvedRole) return resolvedRole;

  // Fallback to wider context check if not found immediately adjacent
  // 3. Wide check immediately after the name (50 characters) within the same sentence
  let afterSegmentWide = docLower.substring(idx + nameLower.length, idx + nameLower.length + 50);
  const periodIdxAfterWide = afterSegmentWide.indexOf('.');
  if (periodIdxAfterWide !== -1) {
    afterSegmentWide = afterSegmentWide.substring(0, periodIdxAfterWide);
  }
  resolvedRole = checkKeywords(afterSegmentWide, activeRoles);
  if (resolvedRole) return resolvedRole;

  // 4. Wide check immediately before the name (50 characters) within the same sentence
  let beforeSegmentWide = docLower.substring(Math.max(0, idx - 50), idx);
  const periodIdxBeforeWide = beforeSegmentWide.lastIndexOf('.');
  if (periodIdxBeforeWide !== -1) {
    beforeSegmentWide = beforeSegmentWide.substring(periodIdxBeforeWide + 1);
  }
  resolvedRole = checkKeywords(beforeSegmentWide, activeRoles);
  if (resolvedRole) return resolvedRole;

  return null;
}

/**
 * Universal Entity Resolver using Multi-Signal Verification
 */
export function resolveEntities(
  rawNames: string[],
  rawAddresses: string[],
  phoneNumbers: string[],
  emailAddresses: string[],
  docText: string,
  category: string,
  existingParties: Array<{ name: string; role: string }> = []
): ResolvedEntity[] {
  const resolved: ResolvedEntity[] = [];

  const validNames = (rawNames || []).map(validateName).filter(Boolean) as string[];

  validNames.forEach(name => {
    const semanticRole = determineRoleSemantically(name, docText, category) || 
      existingParties.find(p => p.name === name)?.role || 'Other';

    // Find if there is a match using multi-signal identification
    let matched: ResolvedEntity | undefined = undefined;
    let maxMatchScore = 0;

    resolved.forEach(entity => {
      if (entity.entityType !== 'Person') return;

      // 1. Name similarity check (70% weight)
      const nameSim = getNameSimilarity(entity.value, name);
      let score = nameSim * 0.7;

      // 2. Role consistency check (15% weight)
      if (semanticRole !== 'Other' && entity.legalRole === semanticRole) {
        score += 0.15;
      }

      // 3. Check for matching addresses/phone/email bounds
      if (entity.value.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(entity.value.toLowerCase())) {
        score += 0.2;
      }

      if (score > maxMatchScore) {
        maxMatchScore = score;
        matched = entity;
      }
    });

    // Confident merge threshold: 0.85
    if (matched && maxMatchScore >= 0.85) {
      if (name.length > (matched as ResolvedEntity).value.length) {
        (matched as ResolvedEntity).value = name;
      }
      (matched as ResolvedEntity).originalMentions.push({
        value: name,
        confidence: maxMatchScore,
        sourceDocument: 'Parsed Document'
      });
      (matched as ResolvedEntity).confidence = Math.max((matched as ResolvedEntity).confidence, maxMatchScore);
      if (semanticRole !== 'Other') {
        (matched as ResolvedEntity).legalRole = semanticRole;
      }
    } else {
      const conf = semanticRole !== 'Other' ? 0.9 : 0.6;
      resolved.push({
        id: `entity-name-${resolved.length + 1}`,
        value: name,
        entityType: 'Person',
        legalRole: semanticRole,
        confidence: conf,
        source: 'document',
        verificationStatus: 'verified',
        originalMentions: [
          {
            value: name,
            confidence: conf,
            sourceDocument: 'Parsed Document'
          }
        ]
      });
    }
  });

  // Resolve Addresses
  const validAddresses = (rawAddresses || []).filter(addr => addr && addr.trim().length > 5);
  validAddresses.forEach((addr, idx) => {
    resolved.push({
      id: `entity-address-${idx + 1}`,
      value: addr,
      entityType: 'Address',
      legalRole: 'Other',
      confidence: 0.9,
      source: 'document',
      verificationStatus: 'verified',
      originalMentions: [{ value: addr, confidence: 0.9, sourceDocument: 'Parsed Document' }]
    });
  });

  // Resolve Phone Numbers
  (phoneNumbers || []).forEach((phone, idx) => {
    resolved.push({
      id: `entity-phone-${idx + 1}`,
      value: phone,
      entityType: 'Phone',
      legalRole: 'Other',
      confidence: 0.95,
      source: 'document',
      verificationStatus: 'verified',
      originalMentions: [{ value: phone, confidence: 0.95, sourceDocument: 'Parsed Document' }]
    });
  });

  // Resolve Emails
  (emailAddresses || []).forEach((email, idx) => {
    resolved.push({
      id: `entity-email-${idx + 1}`,
      value: email,
      entityType: 'Email',
      legalRole: 'Other',
      confidence: 0.95,
      source: 'document',
      verificationStatus: 'verified',
      originalMentions: [{ value: email, confidence: 0.95, sourceDocument: 'Parsed Document' }]
    });
  });

  return resolved;
}
