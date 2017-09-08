'use strict';

/**
 * A method to create incremental new migrations
 * on create migration command.
 * e.g. cassandra-migration create
 * @param path
 */

class Create {

  constructor(fs, path, templateFile, migrationsDirectory) {
    this.fs = fs;
    this.path = path;
    this.migrationsDirectory = migrationsDirectory;
    this.dateString = Math.floor(Date.now() / 1000) + '';

    var template = `
var migration${this.dateString} = {
  up : function (db, handler) {
    var query = '';
    var params = [];
    db.execute(query, params, { prepare: true }, function (err) {
      if (err) {
        handler(err, false);
      } else {
        handler(false, true);
      }
    });
  },
  down : function (db, handler) {
    var query = '';
    var params = [];
    db.execute(query, params, { prepare: true }, function (err) {
      if (err) {
        handler(err, false);
      } else {
        handler(false, true);
      }
    });
  }
};
module.exports = migration${this.dateString};`;

    if (templateFile) {
      template = this.fs.readFileSync(templateFile);
    }

    this.template = template;
  }

  newMigration(title) {
    var reTitle = /^[a-z0-9\_]*$/i;
    if (!reTitle.test(title)) {
      console.log("Invalid title. Only alphanumeric and '_' title is accepted.");
      process.exit(1);
    }

    var fileName = `${this.dateString}_${title}.js`;

    if (this.migrationsDirectory) {
      this.fs.writeFileSync(this.path.join(process.cwd(), this.migrationsDirectory, fileName), this.template);
    } else {
      this.fs.writeFileSync(this.path.join(process.cwd(), fileName), this.template);
    }

    console.log(`Created a new migration file with name ${fileName}`);
  }
}

module.exports = Create;
