import { defineRelations } from 'drizzle-orm';
import * as schema from './index';

export const relations = defineRelations(schema, (r) => ({
    users: {
        profile: r.one.profiles({
            from: r.users.id,
            to: r.profiles.userId,
        }),
        files: r.many.files({
            from: r.users.id,
            to: r.files.uploaderId,
        }),
    },

    profiles: {
        user: r.one.users({
            from: r.profiles.userId,
            to: r.users.id,
        }),
        socialLinks: r.many.socialLinks({
            from: r.profiles.id,
            to: r.socialLinks.profileId,
        }),
        projects: r.many.projects({
            from: r.profiles.id,
            to: r.projects.profileId,
        }),
        avatarFile: r.one.files({
            from: r.profiles.avatarFileId,
            to: r.files.id,
        }),
        coverFile: r.one.files({
            from: r.profiles.coverFileId,
            to: r.files.id,
        }),
        ogFile: r.one.files({
            from: r.profiles.ogImageFileId,
            to: r.files.id,
        }),
        faviconFile: r.one.files({
            from: r.profiles.faviconFileId,
            to: r.files.id,
        }),
    },

    socialLinks: {
        profile: r.one.profiles({
            from: r.socialLinks.profileId,
            to: r.profiles.id,
        }),
    },

    files: {
        uploader: r.one.users({
            from: r.files.uploaderId,
            to: r.users.id,
        }),
    },

    projects: {
        profile: r.one.profiles({
            from: r.projects.profileId,
            to: r.profiles.id,
        }),
        coverFile: r.one.files({
            from: r.projects.coverFileId,
            to: r.files.id,
        }),
        projectCategories: r.many.projectCategories({
            from: r.projects.id,
            to: r.projectCategories.projectId,
        }),
        projectAssets: r.many.projectAssets({
            from: r.projects.id,
            to: r.projectAssets.projectId,
        }),
        projectPersonas: r.many.projectPersonas({
            from: r.projects.id,
            to: r.projectPersonas.projectId,
        }),
        keyMetrics: r.many.projectKeyMetrics({
            from: r.projects.id,
            to: r.projectKeyMetrics.projectId,
        }),
        projectComparisons: r.many.projectComparisons({
            from: r.projects.id,
            to: r.projectComparisons.projectId,
        }),
        projectReviews: r.many.projectReviews({
            from: r.projects.id,
            to: r.projectReviews.projectId,
        }),
        projectItems: r.many.projectItems({
            from: r.projects.id,
            to: r.projectItems.projectId,
        }),
        baCards: r.many.baCards({
            from: r.projects.id,
            to: r.baCards.projectId,
        }),
        colorRoles: r.many.colorRoles({
            from: r.projects.id,
            to: r.colorRoles.projectId,
        }),
    },

    projectCategories: {
        project: r.one.projects({
            from: r.projectCategories.projectId,
            to: r.projects.id,
        }),
        category: r.one.categories({
            from: r.projectCategories.categoryId,
            to: r.categories.id,
        }),
    },

    projectAssets: {
        project: r.one.projects({
            from: r.projectAssets.projectId,
            to: r.projects.id,
        }),
        file: r.one.files({
            from: r.projectAssets.fileId,
            to: r.files.id,
        }),
    },

    projectPersonas: {
        project: r.one.projects({
            from: r.projectPersonas.projectId,
            to: r.projects.id,
        }),
        avatarFile: r.one.files({
            from: r.projectPersonas.avatarFileId,
            to: r.files.id,
        }),
    },

    projectKeyMetrics: {
        project: r.one.projects({
            from: r.projectKeyMetrics.projectId,
            to: r.projects.id,
        }),
    },

    projectComparisons: {
        project: r.one.projects({
            from: r.projectComparisons.projectId,
            to: r.projects.id,
        }),
        beforeFile: r.one.files({
            from: r.projectComparisons.beforeFileId,
            to: r.files.id,
        }),
        afterFile: r.one.files({
            from: r.projectComparisons.afterFileId,
            to: r.files.id,
        }),
    },

    projectReviews: {
        project: r.one.projects({
            from: r.projectReviews.projectId,
            to: r.projects.id,
        }),
        avatarFile: r.one.files({
            from: r.projectReviews.avatarFileId,
            to: r.files.id,
        }),
    },

    projectItems: {
        project: r.one.projects({
            from: r.projectItems.projectId,
            to: r.projects.id,
        }),
    },

    baCards: {
        project: r.one.projects({
            from: r.baCards.projectId,
            to: r.projects.id,
        }),
    },

    colorRoles: {
        project: r.one.projects({
            from: r.colorRoles.projectId,
            to: r.projects.id,
        }),
    },
}));
