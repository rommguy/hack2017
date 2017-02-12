//Read Our Wix Router API here http://docker05.aus.wixpress.com:28750/wix-code-reference-docs/wix-router.html
// todo : for another collection, replace all 'exhibits' with the collection name, including the names of the methods exhibits_all_Router, exhibits_all_SiteMap

import wixData from 'wix-data';
import {ok, notFound, WixRouterSitemapEntry} from "wix-router";

function getPageName(templateVal) {
    return 'exhibit1';
}


export function exhibits_Router(request) {
    let itemName = request.path[0];
    return wixData.query('exhibits')
        .eq('title', itemName)
        .find()
        .then((results) => {
            if (results.items.length) {
                const item = results.items[0];
                let seoData = {
                    title: item.title,
                    description: '',
                    noIndex: false,
                    metaTags: {}
                };

                // Render item page
                const pageName = item.title;
                return ok(getPageName(), item, seoData);
            }

            return notFound();
        });
}

export function exhibits_SiteMap() {
    return wixData.query('exhibits')
        .find()
        .then(function (results) {
            return results.items.map((item) => {
                let entry = new WixRouterSitemapEntry();
                entry.pageName = getPageName();
                entry.url = '/exhibits/' + item.title;
                entry.title = item.title;
                return entry;
            });
        });
}