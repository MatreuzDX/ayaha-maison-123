-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'PROFESSIONAL', 'RECEPTIONIST', 'FINANCE', 'READONLY');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('OWNER', 'EMPLOYEE', 'FREELANCER', 'RENT_CHAIR');

-- CreateEnum
CREATE TYPE "TimeOffType" AS ENUM ('VACATION', 'SICK', 'PERSONAL', 'TRAINING', 'BLOCKED', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('LEAD', 'ACTIVE', 'AT_RISK', 'DORMANT', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AcquisitionSource" AS ENUM ('INSTAGRAM', 'WHATSAPP', 'REFERRAL', 'GOOGLE', 'WALK_BY', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'REMINDED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('CLIENT', 'PROFESSIONAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS', 'INTERNAL');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "RewardKind" AS ENUM ('DISCOUNT_FIXED', 'SERVICE_UPGRADE', 'GIFT_CARD', 'FREE_SERVICE');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('AVAILABLE', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GiftCardStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CouponKind" AS ENUM ('PERCENT', 'FIXED', 'FREE_SERVICE');

-- CreateEnum
CREATE TYPE "StockMovementKind" AS ENUM ('PURCHASE', 'CONSUMPTION', 'ADJUSTMENT', 'LOSS', 'RETURN', 'TRANSFER');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'PARTIAL', 'VOID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'MBWAY', 'TRANSFER', 'GIFT_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "CommissionBasis" AS ENUM ('SERVICE_REVENUE', 'NET_REVENUE', 'FIXED_PER_SERVICE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('CONSENT_FORM', 'ANAMNESIS', 'CONTRACT', 'ID_DOCUMENT', 'INVOICE_PDF', 'PHOTO', 'CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('SERVICE_DELIVERY', 'HEALTH_DATA', 'MARKETING_EMAIL', 'MARKETING_WHATSAPP', 'PHOTOS_INTERNAL', 'PHOTOS_PUBLIC', 'DATA_RETENTION');

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Lisbon',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "baseAddress" TEXT,
    "baseLat" DOUBLE PRECISION,
    "baseLng" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMPTZ(3),
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ(3),
    "mfaSecret" TEXT,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserUnit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "grants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "revokes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unitId" TEXT,
    "expires" TIMESTAMPTZ(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Professional" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "color" TEXT NOT NULL DEFAULT '#C4A870',
    "contractType" "ContractType" NOT NULL DEFAULT 'FREELANCER',
    "hireDate" TIMESTAMPTZ(3),
    "terminationDate" TIMESTAMPTZ(3),
    "taxId" TEXT,
    "ibanEncrypted" TEXT,
    "hasVehicle" BOOLEAN NOT NULL DEFAULT false,
    "transportMode" TEXT NOT NULL DEFAULT 'DRIVING',
    "maxTravelMin" INTEGER NOT NULL DEFAULT 45,
    "homeLat" DOUBLE PRECISION,
    "homeLng" DOUBLE PRECISION,
    "monthlyTargetCents" INTEGER,
    "isBookable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Professional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalSkill" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "durationMin" INTEGER,
    "priceCents" INTEGER,
    "proficiency" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "ProfessionalSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingHour" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "validFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMPTZ(3),

    CONSTRAINT "WorkingHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeOff" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT,
    "unitId" TEXT NOT NULL,
    "type" "TimeOffType" NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "phoneWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "birthDate" TIMESTAMPTZ(3),
    "taxId" TEXT,
    "addressLine" TEXT,
    "addressExtra" TEXT,
    "postalCode" TEXT,
    "city" TEXT DEFAULT 'Lisboa',
    "parish" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "geocodedAt" TIMESTAMPTZ(3),
    "travelZoneId" TEXT,
    "accessNotes" TEXT,
    "parkingNotes" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'LEAD',
    "source" "AcquisitionSource",
    "referredById" TEXT,
    "ownerProfessionalId" TEXT,
    "firstVisitAt" TIMESTAMPTZ(3),
    "lastVisitAt" TIMESTAMPTZ(3),
    "nextVisitAt" TIMESTAMPTZ(3),
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "cancelCount" INTEGER NOT NULL DEFAULT 0,
    "lifetimeValueCents" INTEGER NOT NULL DEFAULT 0,
    "avgTicketCents" INTEGER NOT NULL DEFAULT 0,
    "avgIntervalDays" INTEGER,
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "marketingOptInAt" TIMESTAMPTZ(3),
    "preferredChannel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "language" TEXT NOT NULL DEFAULT 'pt-PT',
    "notes" TEXT,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAddress" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "addressExtra" TEXT,
    "postalCode" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Lisboa',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "travelZoneId" TEXT,
    "accessNotes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientHealthRecord" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "allergies" TEXT,
    "medications" TEXT,
    "eyeConditions" TEXT,
    "contactLenses" BOOLEAN NOT NULL DEFAULT false,
    "previousReactions" TEXT,
    "pregnant" BOOLEAN,
    "skinSensitivity" TEXT,
    "glueSensitivity" BOOLEAN,
    "patchTestAt" TIMESTAMPTZ(3),
    "patchTestResult" TEXT,
    "lastReviewedAt" TIMESTAMPTZ(3),
    "lastReviewedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ClientHealthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientTag" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#C4A870',

    CONSTRAINT "ClientTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientTagLink" (
    "clientId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientTagLink_pkey" PRIMARY KEY ("clientId","tagId")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "tagline" TEXT,
    "durationMin" INTEGER NOT NULL,
    "setupMin" INTEGER NOT NULL DEFAULT 15,
    "teardownMin" INTEGER NOT NULL DEFAULT 5,
    "bufferAfterMin" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER NOT NULL,
    "priceOnRequest" BOOLEAN NOT NULL DEFAULT false,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "vatBps" INTEGER NOT NULL DEFAULT 0,
    "requiresPatchTest" BOOLEAN NOT NULL DEFAULT false,
    "minAdvanceHours" INTEGER NOT NULL DEFAULT 12,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 90,
    "requiresDeposit" BOOLEAN NOT NULL DEFAULT false,
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "isMaintenance" BOOLEAN NOT NULL DEFAULT false,
    "parentServiceId" TEXT,
    "recommendedGapDays" INTEGER,
    "commissionBps" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceMaterial" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ServiceMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "departAt" TIMESTAMPTZ(3) NOT NULL,
    "travelToMin" INTEGER NOT NULL DEFAULT 0,
    "travelFromMin" INTEGER NOT NULL DEFAULT 0,
    "addressId" TEXT,
    "addressSnapshot" JSONB,
    "travelFeeCents" INTEGER NOT NULL DEFAULT 0,
    "travelDistanceM" INTEGER,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "depositPaidAt" TIMESTAMPTZ(3),
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdById" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelledBy" "CancelledBy",
    "cancelReason" TEXT,
    "rescheduledFromId" TEXT,
    "checkedInAt" TIMESTAMPTZ(3),
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "internalNotes" TEXT,
    "clientNotes" TEXT,
    "followUpSentAt" TIMESTAMPTZ(3),
    "ratingStars" INTEGER,
    "ratingComment" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentItem" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "commissionBps" INTEGER,

    CONSTRAINT "AppointmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentStatusChange" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fromStatus" "AppointmentStatus",
    "toStatus" "AppointmentStatus" NOT NULL,
    "changedById" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentPhoto" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelZone" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "freeAboveCents" INTEGER,
    "minSpendCents" INTEGER NOT NULL DEFAULT 0,
    "estimatedMin" INTEGER NOT NULL,
    "maxRadiusKm" DOUBLE PRECISION,
    "postalPrefixes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "color" TEXT NOT NULL DEFAULT '#C4A870',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TravelZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelEstimate" (
    "id" TEXT NOT NULL,
    "originHash" TEXT NOT NULL,
    "destHash" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "timeBand" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "distanceM" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TravelEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceIds" TEXT[],
    "professionalId" TEXT,
    "earliestDate" TIMESTAMPTZ(3) NOT NULL,
    "latestDate" TIMESTAMPTZ(3) NOT NULL,
    "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "preferredStartMin" INTEGER,
    "preferredEndMin" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "offeredSlotAt" TIMESTAMPTZ(3),
    "offerExpiresAt" TIMESTAMPTZ(3),
    "offerCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "clientId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "icon" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "unitId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "providerRef" TEXT,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "clientId" TEXT,
    "appointmentId" TEXT,
    "channel" "MessageChannel" NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "templateKey" TEXT,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "providerId" TEXT,
    "errorMessage" TEXT,
    "scheduledFor" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "deliveredAt" TIMESTAMPTZ(3),
    "readAt" TIMESTAMPTZ(3),
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyProgram" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'AYAHA Club',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stampsRequired" INTEGER NOT NULL DEFAULT 5,
    "autoRestart" BOOLEAN NOT NULL DEFAULT true,
    "rewardValidDays" INTEGER NOT NULL DEFAULT 180,
    "termsText" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyCard" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL DEFAULT 1,
    "stampsCount" INTEGER NOT NULL DEFAULT 0,
    "stampsRequired" INTEGER NOT NULL,
    "completedAt" TIMESTAMPTZ(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LoyaltyCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyStamp" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "reason" TEXT NOT NULL DEFAULT 'APPOINTMENT',
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "revokedReason" TEXT,

    CONSTRAINT "LoyaltyStamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "RewardKind" NOT NULL,
    "valueCents" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'AVAILABLE',
    "chosenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),
    "usedAt" TIMESTAMPTZ(3),
    "usedAppointmentId" TEXT,
    "giftCardId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initialCents" INTEGER NOT NULL,
    "balanceCents" INTEGER NOT NULL,
    "status" "GiftCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "purchaserName" TEXT,
    "purchaserEmail" TEXT,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "ownerClientId" TEXT,
    "message" TEXT,
    "designUrl" TEXT,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),
    "soldById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardTransaction" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "invoiceId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CouponKind" NOT NULL,
    "valueBps" INTEGER,
    "valueCents" INTEGER,
    "serviceId" TEXT,
    "minSubtotalCents" INTEGER NOT NULL DEFAULT 0,
    "maxDiscountCents" INTEGER,
    "validFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMPTZ(3),
    "usageLimit" INTEGER,
    "perClientLimit" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "firstVisitOnly" BOOLEAN NOT NULL DEFAULT false,
    "applicableServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "invoiceId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "supplierId" TEXT,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'un',
    "quantityOnHand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reorderQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "lastCostCents" INTEGER NOT NULL DEFAULT 0,
    "tracksExpiry" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialBatch" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "batchCode" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "kind" "StockMovementKind" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "appointmentId" TEXT,
    "professionalId" TEXT,
    "purchaseOrderId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "reference" TEXT,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderedAt" TIMESTAMPTZ(3),
    "receivedAt" TIMESTAMPTZ(3),
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMPTZ(3),
    "dueAt" TIMESTAMPTZ(3),
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "travelFeeCents" INTEGER NOT NULL DEFAULT 0,
    "vatCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "paidCents" INTEGER NOT NULL DEFAULT 0,
    "clientNameSnapshot" TEXT NOT NULL,
    "clientTaxIdSnapshot" TEXT,
    "externalRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "vatBps" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "serviceId" TEXT,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "appointmentId" TEXT,
    "clientId" TEXT,
    "method" "PaymentMethod" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reference" TEXT,
    "giftCardId" TEXT,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT,
    "cashSessionId" TEXT,
    "isRefund" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "professionalId" TEXT,
    "openedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ(3),
    "openingCents" INTEGER NOT NULL DEFAULT 0,
    "expectedCashCents" INTEGER NOT NULL DEFAULT 0,
    "countedCashCents" INTEGER,
    "differenceCents" INTEGER,
    "notes" TEXT,
    "openedById" TEXT NOT NULL,
    "closedById" TEXT,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "cashSessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isFixed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "vatCents" INTEGER NOT NULL DEFAULT 0,
    "incurredAt" TIMESTAMPTZ(3) NOT NULL,
    "paidAt" TIMESTAMPTZ(3),
    "method" "PaymentMethod",
    "supplierId" TEXT,
    "professionalId" TEXT,
    "receiptPath" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "professionalId" TEXT,
    "serviceId" TEXT,
    "categoryId" TEXT,
    "basis" "CommissionBasis" NOT NULL DEFAULT 'SERVICE_REVENUE',
    "rateBps" INTEGER NOT NULL DEFAULT 4000,
    "fixedCents" INTEGER NOT NULL DEFAULT 0,
    "tierFromCents" INTEGER NOT NULL DEFAULT 0,
    "tierToCents" INTEGER,
    "deductMaterials" BOOLEAN NOT NULL DEFAULT false,
    "deductTravel" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMPTZ(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "invoiceId" TEXT,
    "ruleId" TEXT,
    "baseCents" INTEGER NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "payoutId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL DEFAULT 0,
    "bonusCents" INTEGER NOT NULL DEFAULT 0,
    "deductionCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "paidAt" TIMESTAMPTZ(3),
    "method" "PaymentMethod",
    "reference" TEXT,
    "documentPath" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "clientId" TEXT,
    "professionalId" TEXT,
    "kind" "DocumentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMPTZ(3),
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "name" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerRole" TEXT NOT NULL,
    "clientId" TEXT,
    "imagePath" TEXT NOT NULL,
    "signedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "documentHash" TEXT NOT NULL,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "version" TEXT NOT NULL,
    "textSnapshot" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "documentId" TEXT,
    "ip" TEXT,
    "grantedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "clientId" TEXT,
    "requesterEmail" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "notes" TEXT,
    "resultPath" TEXT,
    "dueAt" TIMESTAMPTZ(3) NOT NULL,
    "completedAt" TIMESTAMPTZ(3),
    "handledById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobQueue" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "runAt" TIMESTAMPTZ(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "lockedAt" TIMESTAMPTZ(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unit_slug_key" ON "Unit"("slug");

-- CreateIndex
CREATE INDEX "Unit_slug_idx" ON "Unit"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserUnit_unitId_role_idx" ON "UserUnit"("unitId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "UserUnit_userId_unitId_key" ON "UserUnit"("userId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expires_idx" ON "Session"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "Professional_userId_key" ON "Professional"("userId");

-- CreateIndex
CREATE INDEX "Professional_unitId_isBookable_idx" ON "Professional"("unitId", "isBookable");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalSkill_professionalId_serviceId_key" ON "ProfessionalSkill"("professionalId", "serviceId");

-- CreateIndex
CREATE INDEX "WorkingHour_professionalId_weekday_idx" ON "WorkingHour"("professionalId", "weekday");

-- CreateIndex
CREATE INDEX "TimeOff_unitId_startAt_endAt_idx" ON "TimeOff"("unitId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "Client_unitId_status_idx" ON "Client"("unitId", "status");

-- CreateIndex
CREATE INDEX "Client_unitId_lastVisitAt_idx" ON "Client"("unitId", "lastVisitAt");

-- CreateIndex
CREATE INDEX "Client_unitId_nextVisitAt_idx" ON "Client"("unitId", "nextVisitAt");

-- CreateIndex
CREATE INDEX "Client_phone_idx" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "ClientAddress_clientId_idx" ON "ClientAddress"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientHealthRecord_clientId_key" ON "ClientHealthRecord"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientTag_unitId_name_key" ON "ClientTag"("unitId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_unitId_slug_key" ON "ServiceCategory"("unitId", "slug");

-- CreateIndex
CREATE INDEX "Service_unitId_isActive_idx" ON "Service"("unitId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Service_unitId_slug_key" ON "Service"("unitId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceMaterial_serviceId_materialId_key" ON "ServiceMaterial"("serviceId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_code_key" ON "Appointment"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_rescheduledFromId_key" ON "Appointment"("rescheduledFromId");

-- CreateIndex
CREATE INDEX "Appointment_unitId_startAt_idx" ON "Appointment"("unitId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_professionalId_startAt_idx" ON "Appointment"("professionalId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_clientId_startAt_idx" ON "Appointment"("clientId", "startAt");

-- CreateIndex
CREATE INDEX "Appointment_unitId_status_startAt_idx" ON "Appointment"("unitId", "status", "startAt");

-- CreateIndex
CREATE INDEX "AppointmentItem_appointmentId_idx" ON "AppointmentItem"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentStatusChange_appointmentId_createdAt_idx" ON "AppointmentStatusChange"("appointmentId", "createdAt");

-- CreateIndex
CREATE INDEX "AppointmentPhoto_appointmentId_idx" ON "AppointmentPhoto"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelZone_unitId_name_key" ON "TravelZone"("unitId", "name");

-- CreateIndex
CREATE INDEX "TravelEstimate_expiresAt_idx" ON "TravelEstimate"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TravelEstimate_originHash_destHash_mode_timeBand_key" ON "TravelEstimate"("originHash", "destHash", "mode", "timeBand");

-- CreateIndex
CREATE INDEX "WaitlistEntry_unitId_status_earliestDate_idx" ON "WaitlistEntry"("unitId", "status", "earliestDate");

-- CreateIndex
CREATE INDEX "TimelineEvent_clientId_occurredAt_idx" ON "TimelineEvent"("clientId", "occurredAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_unitId_entityType_entityId_idx" ON "TimelineEvent"("unitId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_unitId_createdAt_idx" ON "AuditLog"("unitId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_unitId_key_channel_key" ON "MessageTemplate"("unitId", "key", "channel");

-- CreateIndex
CREATE INDEX "Message_unitId_createdAt_idx" ON "Message"("unitId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_clientId_createdAt_idx" ON "Message"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_status_scheduledFor_idx" ON "Message"("status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyProgram_unitId_key" ON "LoyaltyProgram"("unitId");

-- CreateIndex
CREATE INDEX "LoyaltyCard_clientId_isActive_idx" ON "LoyaltyCard"("clientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCard_clientId_cycleNumber_key" ON "LoyaltyCard"("clientId", "cycleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyStamp_appointmentId_key" ON "LoyaltyStamp"("appointmentId");

-- CreateIndex
CREATE INDEX "LoyaltyStamp_cardId_createdAt_idx" ON "LoyaltyStamp"("cardId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardRedemption_cardId_key" ON "RewardRedemption"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardRedemption_code_key" ON "RewardRedemption"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RewardRedemption_giftCardId_key" ON "RewardRedemption"("giftCardId");

-- CreateIndex
CREATE INDEX "RewardRedemption_clientId_status_idx" ON "RewardRedemption"("clientId", "status");

-- CreateIndex
CREATE INDEX "RewardRedemption_unitId_status_idx" ON "RewardRedemption"("unitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");

-- CreateIndex
CREATE INDEX "GiftCard_unitId_status_idx" ON "GiftCard"("unitId", "status");

-- CreateIndex
CREATE INDEX "GiftCardTransaction_giftCardId_createdAt_idx" ON "GiftCardTransaction"("giftCardId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_unitId_code_key" ON "Coupon"("unitId", "code");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_clientId_idx" ON "CouponRedemption"("couponId", "clientId");

-- CreateIndex
CREATE INDEX "Material_unitId_isActive_idx" ON "Material"("unitId", "isActive");

-- CreateIndex
CREATE INDEX "MaterialBatch_materialId_expiresAt_idx" ON "MaterialBatch"("materialId", "expiresAt");

-- CreateIndex
CREATE INDEX "StockMovement_unitId_createdAt_idx" ON "StockMovement"("unitId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_materialId_createdAt_idx" ON "StockMovement"("materialId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_appointmentId_key" ON "Invoice"("appointmentId");

-- CreateIndex
CREATE INDEX "Invoice_unitId_issuedAt_idx" ON "Invoice"("unitId", "issuedAt");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_unitId_number_key" ON "Invoice"("unitId", "number");

-- CreateIndex
CREATE INDEX "Payment_unitId_receivedAt_idx" ON "Payment"("unitId", "receivedAt");

-- CreateIndex
CREATE INDEX "CashSession_unitId_openedAt_idx" ON "CashSession"("unitId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_unitId_name_key" ON "ExpenseCategory"("unitId", "name");

-- CreateIndex
CREATE INDEX "Expense_unitId_incurredAt_idx" ON "Expense"("unitId", "incurredAt");

-- CreateIndex
CREATE INDEX "CommissionRule_unitId_professionalId_isActive_idx" ON "CommissionRule"("unitId", "professionalId", "isActive");

-- CreateIndex
CREATE INDEX "Commission_unitId_periodYear_periodMonth_idx" ON "Commission"("unitId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "Commission_professionalId_status_idx" ON "Commission"("professionalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_unitId_professionalId_periodYear_periodMonth_key" ON "Payout"("unitId", "professionalId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "Document_unitId_clientId_idx" ON "Document"("unitId", "clientId");

-- CreateIndex
CREATE INDEX "Signature_documentId_idx" ON "Signature"("documentId");

-- CreateIndex
CREATE INDEX "Consent_clientId_purpose_idx" ON "Consent"("clientId", "purpose");

-- CreateIndex
CREATE INDEX "DataRequest_unitId_status_dueAt_idx" ON "DataRequest"("unitId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "JobQueue_status_runAt_idx" ON "JobQueue"("status", "runAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_unitId_key_key" ON "Setting"("unitId", "key");

-- AddForeignKey
ALTER TABLE "UserUnit" ADD CONSTRAINT "UserUnit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUnit" ADD CONSTRAINT "UserUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Professional" ADD CONSTRAINT "Professional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Professional" ADD CONSTRAINT "Professional_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalSkill" ADD CONSTRAINT "ProfessionalSkill_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalSkill" ADD CONSTRAINT "ProfessionalSkill_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingHour" ADD CONSTRAINT "WorkingHour_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_travelZoneId_fkey" FOREIGN KEY ("travelZoneId") REFERENCES "TravelZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_ownerProfessionalId_fkey" FOREIGN KEY ("ownerProfessionalId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAddress" ADD CONSTRAINT "ClientAddress_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAddress" ADD CONSTRAINT "ClientAddress_travelZoneId_fkey" FOREIGN KEY ("travelZoneId") REFERENCES "TravelZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientHealthRecord" ADD CONSTRAINT "ClientHealthRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTag" ADD CONSTRAINT "ClientTag_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTagLink" ADD CONSTRAINT "ClientTagLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTagLink" ADD CONSTRAINT "ClientTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ClientTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_parentServiceId_fkey" FOREIGN KEY ("parentServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMaterial" ADD CONSTRAINT "ServiceMaterial_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMaterial" ADD CONSTRAINT "ServiceMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "ClientAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentItem" ADD CONSTRAINT "AppointmentItem_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentItem" ADD CONSTRAINT "AppointmentItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentStatusChange" ADD CONSTRAINT "AppointmentStatusChange_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPhoto" ADD CONSTRAINT "AppointmentPhoto_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelZone" ADD CONSTRAINT "TravelZone_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyCard" ADD CONSTRAINT "LoyaltyCard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyStamp" ADD CONSTRAINT "LoyaltyStamp_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "LoyaltyCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyStamp" ADD CONSTRAINT "LoyaltyStamp_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "LoyaltyCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_ownerClientId_fkey" FOREIGN KEY ("ownerClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialBatch" ADD CONSTRAINT "MaterialBatch_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

