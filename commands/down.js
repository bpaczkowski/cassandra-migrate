'use strict';
var async = require('async');
var migration_settings = require('../scripts/migrationSettings.json');
var path = require('path');

class down {
  constructor(db, pendingMigrations, migrationsDirectory) {
    this.db = db;
    this.pending = pendingMigrations;
    this.keyList = Object.keys(pendingMigrations).sort(function (a, b) {
      return b - a;
    });
    this.migrationsDirectory = migrationsDirectory;
  }

  runPending(skip) {
    return new Promise((resolve, reject) => {
      async.eachSeries(this.keyList, (id, callback) => {
        let fileName = this.pending[ id ];
        let attributes = fileName.split("_");
        let query = {
          'file_name': fileName, 'migration_number': attributes[ 0 ], 'title': fileName.replace(".js", "")
        };
        let migrationsPath = process.cwd();

        if (this.migrationsDirectory) {
          migrationsPath = path.join(migrationsPath, this.migrationsDirectory);
        }

        query.run = require(path.join(migrationsPath, fileName));

        if (skip) {
          if (skip == query.migration_number) {
            console.log(`removing ${query.file_name} from migration table, skipping migration`);
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
          reject(`Error Rolling Back Migrations: ${err}`);
        } else {
          resolve('All Migrations Rolled Back Successfully');
        }
      });

    });
  }

  run(query) {
    return new Promise((resolve, reject) => {
      console.log(`Rolling back changes: ${query.title}`);
      let db = this.db;
      let result = query.run.down(db, function (err) {
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
      delete query.migration_number;
      delete query.title;
      db.execute(migration_settings.deleteMigration, query, { prepare: true }, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(`Successfully Rolled Back ${query.title}`);
        }
      });
    })
  }

}

module.exports = down;
