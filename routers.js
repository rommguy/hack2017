//Read Our Wix Router API here http://docker05.aus.wixpress.com:28750/wix-code-reference-docs/wix-router.html
// todo : for another collection, replace all 'exhibits' with the collection name, including the names of the methods exhibits_all_Router, exhibits_all_SiteMap

import wixData from 'wix-data';
import {ok, notFound, WixRouterSitemapEntry} from "wix-router";

function getExhibitPageName(itemId) {
    return wixData.get('cms', '_' + itemId + '_En')
        .then((itemData) => {
            return (itemData && itemData.template) || 'exhibits1';
        });
}

export function exhibits_Router(request) {
    let itemTitle = request.path[0];
    let itemFromDB, seoData;
    return wixData.query('exhibits')
        .find()
        .then((results) => {
            const matchingItems = results.items.filter((resultItem) => encodeUrl(resultItem.title) === encodeUrl(itemTitle));
            if (matchingItems.length) {
                itemFromDB = matchingItems[0];
                seoData = {
                    title: itemFromDB.title,
                    description: '',
                    noIndex: false,
                    metaTags: {}
                };

                // Render item page
                return getExhibitPageName(itemFromDB._id);
            }
        }).then((pageName) => {
            if (pageName) {
                return ok(pageName, itemFromDB, seoData);
            }
            return notFound();
        });
}

export function exhibits_SiteMap() {
    return wixData.query('exhibits')
        .find()
        .then(function (results) {
            return Promise.all(results.items.map((item) => {
                let entry = new WixRouterSitemapEntry();
                return getExhibitPageName(item._id)
                    .then((pageName) => {
                        entry.pageName = pageName;
                        entry.url = '/exhibits/' + encodeUrl(item.title);
                        entry.title = encodeUrl(item.title);
                        return entry;
                    });
            }));
        });
}

function encodeUrl(title) {
    return title.indexOf('%') === -1 ? encodeURIComponent(title) : title;
}