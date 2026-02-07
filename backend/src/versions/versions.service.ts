import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentVersion, Prisma } from '@prisma/client';

import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Content version with relations
 */
export interface VersionWithRelations extends ContentVersion {
  createdBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  content?: {
    id: string;
    title: string;
    slug: string;
    status: string;
  };
}

/**
 * Versions Service
 * Manages content version history, comparison, and rollback operations
 */
@Injectable()
export class VersionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all versions for a specific content
   * Returns paginated list ordered by versionNumber DESC
   * Includes createdBy user relation (password excluded)
   */
  async findAllForContent(
    contentId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponseDto<VersionWithRelations>> {
    // Verify content exists
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found`);
    }

    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [versions, total] = await Promise.all([
      this.prisma.contentVersion.findMany({
        where: { contentId },
        skip,
        take: limit,
        orderBy: { versionNumber: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.contentVersion.count({ where: { contentId } }),
    ]);

    return new PaginatedResponseDto(versions as VersionWithRelations[], total, page, limit);
  }

  /**
   * Find single version by ID
   * Returns version with content and createdBy relations
   */
  async findOne(versionId: string): Promise<VersionWithRelations> {
    const version = await this.prisma.contentVersion.findUnique({
      where: { id: versionId },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        content: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException(`Version with ID ${versionId} not found`);
    }

    return version as VersionWithRelations;
  }

  /**
   * Compare two versions of the same content
   * Returns both version objects for frontend diff rendering
   * Validates both versions exist and belong to same content
   */
  async compareVersions(
    contentId: string,
    v1: number,
    v2: number,
  ): Promise<{ version1: VersionWithRelations; version2: VersionWithRelations }> {
    // Verify content exists
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found`);
    }

    // Fetch both versions in parallel
    const [version1, version2] = await Promise.all([
      this.prisma.contentVersion.findUnique({
        where: {
          contentId_versionNumber: {
            contentId,
            versionNumber: v1,
          },
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.contentVersion.findUnique({
        where: {
          contentId_versionNumber: {
            contentId,
            versionNumber: v2,
          },
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
    ]);

    if (!version1) {
      throw new NotFoundException(`Version ${v1} not found for content ${contentId}`);
    }

    if (!version2) {
      throw new NotFoundException(`Version ${v2} not found for content ${contentId}`);
    }

    return {
      version1: version1 as VersionWithRelations,
      version2: version2 as VersionWithRelations,
    };
  }

  /**
   * Rollback content to a specific version
   * Creates NEW version with title/body from target version
   * Increments versionNumber (get max + 1)
   * Sets changeDescription: "Rolled back to version {versionNumber}"
   * Updates Content record with values from target version
   * Returns updated content with new version
   * Uses transaction for atomicity
   */
  async rollback(contentId: string, targetVersionNumber: number, userId: string): Promise<any> {
    // Verify content exists
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found`);
    }

    // Get target version
    const targetVersion = await this.prisma.contentVersion.findUnique({
      where: {
        contentId_versionNumber: {
          contentId,
          versionNumber: targetVersionNumber,
        },
      },
    });

    if (!targetVersion) {
      throw new NotFoundException(
        `Version ${targetVersionNumber} not found for content ${contentId}`,
      );
    }

    // Check if trying to rollback to the current version
    const currentVersion = content.versions[0];
    if (currentVersion && currentVersion.versionNumber === targetVersionNumber) {
      throw new BadRequestException('Cannot rollback to the current version');
    }

    // Use transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Get next version number
      const maxVersion = await tx.contentVersion.aggregate({
        where: { contentId },
        _max: { versionNumber: true },
      });
      const nextVersionNumber = (maxVersion._max.versionNumber || 0) + 1;

      // Create new version with target version content
      const newVersion = await tx.contentVersion.create({
        data: {
          contentId,
          title: targetVersion.title,
          body: targetVersion.body,
          versionNumber: nextVersionNumber,
          changeDescription: `Rolled back to version ${targetVersionNumber}`,
          createdById: userId,
        },
      });

      // Update content with target version values
      const updatedContent = await tx.content.update({
        where: { id: contentId },
        data: {
          title: targetVersion.title,
          body: targetVersion.body,
        },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          categories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          featuredImage: {
            select: {
              id: true,
              filename: true,
              url: true,
              thumbnailUrl: true,
              altText: true,
            },
          },
          versions: {
            where: { id: newVersion.id },
            include: {
              createdBy: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      return updatedContent;
    });

    return result;
  }
}
