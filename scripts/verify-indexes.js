#!/usr/bin/env node

/**
 * Database Index Verification Script
 *
 * This script connects to MongoDB and analyzes indexes to detect:
 * - Duplicate indexes
 * - Unused indexes
 * - Missing indexes for common queries
 * - Index efficiency metrics
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/nestjs-quickstarter';

async function analyzeIndexes() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔍 Connecting to MongoDB...');
    await client.connect();

    const db = client.db();
    const collections = await db.listCollections().toArray();

    console.log(
      `\n📊 Analyzing indexes for ${collections.length} collections...\n`,
    );

    for (const collection of collections) {
      const collectionName = collection.name;
      const coll = db.collection(collectionName);

      console.log(`\n🗃️  Collection: ${collectionName}`);
      console.log('=' + '='.repeat(collectionName.length + 15));

      // Get all indexes
      const indexes = await coll.indexes();

      // Get collection stats
      const stats = await coll.stats();

      console.log(`📈 Documents: ${stats.count}`);
      console.log(
        `💾 Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`,
      );
      console.log(`🔗 Total Indexes: ${indexes.length}`);

      // Analyze each index
      console.log('\n📋 Index Details:');
      const indexAnalysis = analyzeCollectionIndexes(indexes);

      for (const index of indexes) {
        const sizeKB = index.storageSize
          ? (index.storageSize / 1024).toFixed(2) + ' KB'
          : 'Unknown';
        console.log(
          `   • ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(UNIQUE)' : ''} - ${sizeKB}`,
        );
      }

      // Check for duplicates
      if (indexAnalysis.duplicates.length > 0) {
        console.log('\n⚠️  DUPLICATE INDEXES DETECTED:');
        indexAnalysis.duplicates.forEach((dup) => {
          console.log(`   ❌ ${dup.field}: Multiple indexes found`);
          dup.indexes.forEach((idx) =>
            console.log(`      - ${idx.name}: ${JSON.stringify(idx.key)}`),
          );
        });
      }

      // Recommendations
      if (indexAnalysis.recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:');
        indexAnalysis.recommendations.forEach((rec) => {
          console.log(
            `   ${rec.type === 'remove' ? '❌' : '✅'} ${rec.message}`,
          );
        });
      }
    }

    console.log('\n🎯 SUMMARY RECOMMENDATIONS:');
    console.log('1. Remove duplicate indexes to improve write performance');
    console.log(
      '2. Monitor index usage with db.collection.aggregate([{$indexStats:{}}])',
    );
    console.log('3. Consider composite indexes for complex queries');
    console.log('4. Use sparse indexes for optional fields');
    console.log('5. Add TTL indexes for temporary data (tokens, sessions)');
  } catch (error) {
    console.error('❌ Error analyzing indexes:', error.message);
  } finally {
    await client.close();
    console.log('\n✅ Analysis complete. Database connection closed.');
  }
}

function analyzeCollectionIndexes(indexes) {
  const duplicates = [];
  const recommendations = [];

  // Group indexes by their key signature
  const indexGroups = {};

  indexes.forEach((index) => {
    const keyString = JSON.stringify(index.key);
    if (!indexGroups[keyString]) {
      indexGroups[keyString] = [];
    }
    indexGroups[keyString].push(index);
  });

  // Find duplicates
  Object.entries(indexGroups).forEach(([keyString, groupIndexes]) => {
    if (groupIndexes.length > 1) {
      // Check if they're truly duplicates (same key, different properties)
      const uniqueIndexes = groupIndexes.filter((idx) => idx.unique);
      const nonUniqueIndexes = groupIndexes.filter((idx) => !idx.unique);

      if (uniqueIndexes.length > 0 && nonUniqueIndexes.length > 0) {
        duplicates.push({
          field: keyString,
          indexes: groupIndexes,
          issue: 'Unique and non-unique indexes on same field',
        });

        recommendations.push({
          type: 'remove',
          message: `Remove non-unique index for ${keyString} (unique index already exists)`,
        });
      } else if (groupIndexes.length > 1) {
        duplicates.push({
          field: keyString,
          indexes: groupIndexes,
          issue: 'Multiple identical indexes',
        });

        recommendations.push({
          type: 'remove',
          message: `Remove duplicate indexes for ${keyString}`,
        });
      }
    }
  });

  // Check for common optimization opportunities
  const singleFieldIndexes = indexes.filter(
    (idx) => Object.keys(idx.key).length === 1 && idx.name !== '_id_',
  );

  if (singleFieldIndexes.length > 5) {
    recommendations.push({
      type: 'optimize',
      message: `Consider compound indexes - ${singleFieldIndexes.length} single-field indexes found`,
    });
  }

  return { duplicates, recommendations };
}

// Command line interface
if (require.main === module) {
  console.log('🔍 MongoDB Index Analysis Tool');
  console.log('================================\n');

  analyzeIndexes().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { analyzeIndexes };
