/* global require */
import _ from 'lodash';
import {env} from './env';
const bizSdk = require('facebook-nodejs-business-sdk');

const {
  AdAccount,
  Campaign,
  AdSet,
  // AdCreative,
  // AdImage,
  // Ad,
  User,
  Page,
  IGUser,
  InstagramInsightsResult,
} = bizSdk;

export default class Facebook {

  static async getAdCampaignInsights(userId, accessToken) {
    let fields;
    let params;

    bizSdk.FacebookAdsApi.init(accessToken);

    fields = [
      User.Fields.accessToken,
    ];
    params = {};

    const adAccounts = await (new User(userId)).getAdAccounts(
      fields,
      params
    );

    const adAccountID = adAccounts[0].id;

    fields = ["reach","spend"];
    params = {
      date_preset: 'this_month'
    };

    return (new AdAccount(adAccountID)).getInsights(fields, params);
  }

  static async getAdCampaigns(userId, accessToken) {
    let fields;
    let params;

    bizSdk.FacebookAdsApi.init(accessToken);

    fields = [
      User.Fields.accessToken,
    ];
    params = {};

    const adAccounts = await (new User(userId)).getAdAccounts(
      fields,
      params
    );

    const adAccountID = adAccounts[0].id;

    fields = [
      Campaign.Fields.name,
      Campaign.Fields.status,
      Campaign.Fields.buying_type
    ];
    params = {};

    return (new AdAccount(adAccountID)).getCampaigns(fields, params);
  }

  static async getAdCampaignFields() {
    return {
      fields: Campaign.Fields,
      objective: Campaign.Objective
    };
  }

  static async createAdCampaign(userId, accessToken, data) {
    let fields;
    let params;

    bizSdk.FacebookAdsApi.init(accessToken);

    fields = [
      User.Fields.accessToken,
    ];
    params = {};
    const adAccounts = await (new User(userId)).getAdAccounts(
      fields,
      params
    );
    const adAccountID = adAccounts[0].id;

    let {name, objective} = data;

    fields = [
      Campaign.Fields.Id
    ];
    params = {
      [Campaign.Fields.name]: name, // Each object contains a fields map with a list of fields supported on that object.
      [Campaign.Fields.status]: Campaign.Status.paused,
      [Campaign.Fields.objective]: objective
      // [Campaign.Fields.objective]: Campaign.Objective.page_likes
    };

    return (new AdAccount(adAccountID)).createCampaign(fields, params);
  }

  static async createAdSet(userId, accessToken, data) {
    let fields;
    let params;

    bizSdk.FacebookAdsApi.init(accessToken);

    fields = [
      User.Fields.accessToken,
    ];
    params = {};
    const adAccounts = await (new User(userId)).getAdAccounts(
      fields,
      params
    );
    const adAccountID = adAccounts[0].id;

    let adSetData = _.pick(data, [
      AdSet.Fields.name,
      AdSet.Fields.daily_budget,
      AdSet.Fields.bid_amount,
      AdSet.Fields.billing_event,
      AdSet.Fields.optimization_goal,
      AdSet.Fields.campaign_id,
      AdSet.Fields.object_store_url,
      AdSet.Fields.promoted_object,
      AdSet.Fields.targeting,
      AdSet.Fields.status,
    ]);

    fields = [];
    params = {
      [AdSet.Fields.name]: adSetData.name,
      [AdSet.Fields.daily_budget]: adSetData.daily_budget,
      [AdSet.Fields.bid_amount]: adSetData.bid_amount,
      [AdSet.Fields.billing_event]: adSetData.billing_event,
      [AdSet.Fields.optimization_goal]: adSetData.optimization_goal, // AdSet.OptimizationGoal.reach, // must be the same as company objective
      [AdSet.Fields.campaign_id]: adSetData.campaign_id, //'23843688508520162'
      [AdSet.Fields.promoted_object]: {
        'application_id': env.FACEBOOK_APP_ID,
        'object_store_url': adSetData.object_store_url, // 'https://apps.apple.com/ua/app/xcode/id497799835?l=ru&mt=12'
      },
      // 'promoted_object' : {'page_id':'<pageID>'},
      // [AdSet.Fields.targeting]: {
      //   'device_platforms': ['mobile'],
      //   'facebook_positions': ['feed'],
      //   'geo_locations': { 'countries': ['US'] },
      //   'publisher_platforms':['facebook','audience_network'],
      //   'user_os':['IOS']
      // },
      [AdSet.Fields.targeting]: adSetData.targeting,
      [AdSet.Fields.status]: adSetData.status,
    };

    return (new AdAccount(adAccountID)).createAdSet(fields, params);
  }

  static async createAdImage(userId, accessToken, buffer) {
    let fields;
    let params;

    bizSdk.FacebookAdsApi.init(accessToken);

    fields = [
      User.Fields.accessToken,
    ];
    params = {};
    const adAccounts = await (new User(userId)).getAdAccounts(
      fields,
      params
    );

    fields = [];
    params = {
      bytes: buffer.toString('base64')
    };

    return (new AdAccount(adAccounts[0].id)).createAdImage(fields, params);
  }

  static async createAdCreative(userId, accessToken, data) {
    let fields;
    let params;

    bizSdk.FacebookAdsApi.init(accessToken);

    fields = [
      User.Fields.accessToken,
    ];
    params = {};
    const adAccounts = await (new User(userId)).getAdAccounts(
      fields,
      params
    );

    const account = (new AdAccount(adAccounts[0].id));

    let adCreativeData = _.pick(data, [
      'name',
      'hash',
      'page_id',
      'message',
    ]);

    fields = [];
    params = {
      'name' : adCreativeData.name,
      'object_story_spec': {
        'page_id': adCreativeData.page_id,
        'link_data': {
          'image_hash': adCreativeData.hash,
          'link': `http://facebook.com/${adCreativeData.page_id}`,
          'message': adCreativeData.message
        }
      },
    };

    // params = {
    //   'name' : 'Sample Creative',
    //   'object_story_spec': {
    //     'page_id': page_id,
    //     'link_data': {
    //       'image_hash': "2a48504c2495df59d16f3a2d25aab9d8",
    //       'link': `http://facebook.com/${page_id}`,
    //       'message':'try it out'
    //     }
    //   },
    // };

    return account.createAdCreative(fields, params);
  }

  static async createAd(userId, accessToken, data) {
    let fields;
    let params;

    bizSdk.FacebookAdsApi.init(accessToken);

    fields = [
      User.Fields.accessToken,
    ];
    params = {};
    const adAccounts = await (new User(userId)).getAdAccounts(
      fields,
      params
    );

    const account = (new AdAccount(adAccounts[0].id));

    let adData = _.pick(data, [
      'name',
      'adset_id',
      'creative',
      'status',
    ]);

    fields = [];
    // params = {
    //   'name' : 'My Ad',
    //   'adset_id' : '<adSetID>',
    //   'creative' : {'creative_id':'<adCreativeID>'},
    //   'status' : 'PAUSED',
    // };
    params = {
      'name': adData.name,
      'adset_id': adData.adset_id,
      'creative': {
        'creative_id': adData.creative
      },
      'status': adData.status,
    };

    return account.createAd(fields, params);
  }

  static async getIGInsights(userId, accessToken) {
    let fields;
    let params;

    bizSdk.FacebookAdsApi.init(accessToken);

    fields = [
      User.Fields.accessToken,
    ];
    params = {};

    let pages = await (new User(userId)).getAccounts(
      fields,
      params
    );

    let page_id = pages[1].id;

    // Then we get first page's insight using page access token
    bizSdk.FacebookAdsApi.init(pages[1].access_token);
    fields = [
      Page.Fields.instagram_business_account,
    ];
    params = {};

    let { instagram_business_account } = await (new Page(page_id)).get(fields, params);

    fields = [];
    params = {
      metric: [
        InstagramInsightsResult.Metric.impressions,
        InstagramInsightsResult.Metric.reach,
      ],
      period: InstagramInsightsResult.Period.day
    };

    let insights = await (new IGUser(instagram_business_account.id)).getInsights(
      fields,
      params
    );

    return insights;
  }
}