'use strict';
var async = require('async');
var migration_settings = require('../scripts/migrationSettings.json');
var path = require('path');

class Up {
  constructor(db, pendingMigrations, migrationsDirectory) {
    this.db = db;
    this.pending = pendingMigrations;
    this.keyList = Object.keys(pendingMigrations).sort(function (a, b) {
      return a - b;
    });
    this.migrationsDirectory = migrationsDirectory;
  }

  runPending(skip) {
    return new Promise((resolve, reject) => {
      async.eachSeries(this.keyList, (id, callback) => {
        let fileName = this.pending[ id ];
        let attributes = fileName.split("_");
        let query = {
          'file_name': fileName,
          'migration_number': attributes[ 0 ],
          'title': fileName.replace(".js", ""),
        };
        let migrationsPath = process.cwd();

        if (this.migrationsDirectory) {
          migrationsPath = path.join(migrationsPath, this.migrationsDirectory);
        }

        query.run = require(path.join(migrationsPath, fileName));

        if (skip) {
          if (query.migration_number == skip) {
            console.log(`adding ${query.file_name} to Migration table, skipping migration`);
            this.updateMigrationTable(query)
              .then((result) => callback(null, result))
              .catch((error) => callback(error));
          } else {
            callback(null, '');
          }
        } else {
          this.run(query)
            .then((query) => this.updateMigrationTable(query))
            .then((result) => callback(null, result))
            .catch((error) => callback(error));
        }

      }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve('All Migrations Ran Successfully');
        }
      });

    });
  }

  run(query) {
    return new Promise((resolve, reject) => {
      console.log(`Migrating changes: ${query.title}`);
      let db = this.db;
      let result = query.run.up(db, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(query);
        }
      });

      if (result && typeof result.then === 'function' && typeof result.catch === 'function') {
        result
          .then(resolve)
          .catch(reject);
      }
    });
  }

  updateMigrationTable(query) {
    return new Promise((resolve, reject) => {
      let db = this.db;
      delete query.run;
      query.created_at = Date.now();
      db.execute(migration_settings.insertMigration, query, { prepare: true }, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(`Successfully Migrated ${query.title}`);
        }
      });
    })
  }


}

module.exports = Up;
