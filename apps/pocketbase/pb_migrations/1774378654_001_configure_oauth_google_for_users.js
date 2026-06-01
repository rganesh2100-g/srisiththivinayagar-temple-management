/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  const newProviders = [
    {
        "name": "google",
        "clientId": $os.getenv("GOOGLE_OAUTH_CLIENT_ID") || "",
        "clientSecret": $os.getenv("GOOGLE_OAUTH_CLIENT_SECRET") || "",
        "authURL": "",
        "tokenURL": "",
        "userInfoURL": "",
        "displayName": "",
        "pkce": null
    }
];

  // Upsert: keep providers not in newProviders, then add/replace with newProviders
  collection.oauth2.providers = [
    ...collection.oauth2.providers.filter(p =>
      !newProviders.find(np => np.name === p.name)
    ),
    ...newProviders
  ];
  collection.oauth2.enabled = true;
  collection.oauth2.mappedFields = {
    id: "",
    name: "name",
    username: "",
    avatarURL: "avatar"
  };

  return app.save(collection);
}, (app) => {
  // Rollback: remove the added providers
  const collection = app.findCollectionByNameOrId("users");
  const providerNamesToRemove = ["google"];
  collection.oauth2.providers = collection.oauth2.providers.filter(p =>
    !providerNamesToRemove.includes(p.name)
  );
  if (collection.oauth2.providers.length === 0) {
    collection.oauth2.enabled = false;
  }
  return app.save(collection);
})