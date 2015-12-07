/**
 * This script adds a youtube video to a playlist.
 **/

'use strict';

var Youtube = require("youtube-api"),
  fs = require("fs"),
  ReadJson = require("r-json"),
  Lien = require("lien"),
  Opn = require("opn");

const CREDENTIALS = ReadJson(process.env.HOME + "/.youtube-api-creds.json");

function requestAuth(callback) {
  var oauth = Youtube.authenticate({
    type: "oauth",
    client_id: CREDENTIALS.web.client_id,
    client_secret: CREDENTIALS.web.client_secret,
    redirect_url: CREDENTIALS.web.redirect_uris[0]
  });

  var server = new Lien({
    host: "localhost",
    port: 5000
  });

  Opn(oauth.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube"]
  }));

  // Handle oauth2 callback
  server.page.add("/oauth2callback", function(lien) {
    console.log("Trying to get the token using the following code: " + lien.search.code);
    oauth.getToken(lien.search.code, function(err, tokens) {
      if (err) {
        lien(err, 400);
        return console.log(err);
      }
      lien.end("Done! You can close this tab now.");
      oauth.setCredentials(tokens);
      callback(tokens, oauth);
    });
  });
}

function addVideo(playlist, video, callback) {
  Youtube.playlistItems.insert({
    resource: {
      snippet: {
        playlistId: playlist,
        resourceId: {
          videoId: video,
          kind: "youtube#video"
        }
      }
    },
    part: "snippet",
  }, callback);
}

function saveCreds(creds) {
  console.log("Saving creds...");
  var cstring = JSON.stringify(creds);
  fs.writeFile(process.env.HOME + "/.youtube-api.json", cstring, function(err) {
    if (err) {
      console.log("Error saving creds.");
    } else {
      console.log("Creds saved!");
    }
  });
}

function addTestVideo(retry) {
  console.log("Adding test video...");
  addVideo("PLIWpihWoKuZ7SqE1OyK_5Obe1WmK0kSWW", "yn7ocg9o8VI", function(err) {
    if (err) {
      if (err.code === 401) {
        console.log("Auth failed, retrying...");
        requestAuth(function(tokens, oauth) {
          saveCreds(tokens);
          retry === true && process.exit(1);
          addTestVideo(true);
        });
      } else {
        console.log("Error adding video");
        console.log(err);
      }
    } else {
      console.log("Added!");
      process.exit();
    }
  });
}

function main() {

  fs.exists(process.env.HOME + "/.youtube-api.json", function(exists) {
    if (exists) {
      console.log("Reading creds...");
      var creds = ReadJson(process.env.HOME + "/.youtube-api.json")
      var oauth = Youtube.authenticate({
        type: "oauth",
        client_id: CREDENTIALS.web.client_id,
        client_secret: CREDENTIALS.web.client_secret
      });
      oauth.setCredentials({
        access_token: creds.access_token
      });
      addTestVideo();
    } else {
      requestAuth(function(tokens, oauth) {
        saveCreds(tokens);
        addTestVideo();
      });
    }
  });

}

main();
