import {lightbox} from 'wix-site';
import wixData from 'wix-data';

import {getAllComponents} from 'public/helpers';

let pullPromise = pull();

function pageToJSON(page) {
    const {id, type, global, rendered, title, description, url, visibleInMenu} = page;
    return {id, type, global, rendered, title, description, url, visibleInMenu};
}

$w.onReady(function () {

    return pullPromise.then((data) => {
        data.items.forEach(updatePage);
    }).then(() => {
        $w('#cmsbutton').onClick(openCMS);

        pullDBChanges((data) => {
            data.items.forEach(updatePage);
        });
    });
});

const getCurrentPage = () => {
    let comps = $w('Image');
    if (!comps.length) {
        comps = $w('Text');
    }
    let parent = comps.parent;
    while (parent && parent.type !== '$w.Page') {
        parent = parent.parent;
    }
    return parent;
};

function updatePage(page) {
    const dataset = $w('#dynamicDataset');
    let dbItem;
    if (dataset) {
        dbItem = dataset.getCurrentItem();
    }

    const isMatchPage = dataset ? (('_' + dbItem._id) === page._id) : (page._id === $w('Page').title);
    if (isMatchPage) {
        const components = page.components;

        for (let k in components) {
            let item = page.components[k];
            let relatedComp = $w(`#${k}`);
            if (relatedComp.type === '$w.Text') {
                relatedComp.text = item.fields.text;
            }
            if (relatedComp.type === '$w.Image') {
                relatedComp.src = item.fields.src;
            }
        }
    }
}

function pull() {
    return wixData.query('cms').find();
}

function pullDBChanges(onData, interval = 2000) {
    return setInterval(() => {
        pull().then(onData);
    }, interval);
}

export function openCMS() {
    debugger;
    console.log('openCMS');
    const dataset = $w('#dynamicDataset');
    const isDynamic = !!dataset;
    let dbItem;
    if (dataset) {
        dbItem = dataset.getCurrentItem();
    }
    const page = getCurrentPage();

    lightbox.open('cms', {
            isDynamic: isDynamic,
            itemId: dbItem && dbItem._id,
            page: pageToJSON(page),
            collection: 'cms',
            components: getAllComponents(page).map((comp) => comp.toJSON())
        }
    ).then(() => {
        $w('#cmsbutton').onClick(openCMS);
    });
}
