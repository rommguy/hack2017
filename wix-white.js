
export function initWixWhiteCMS($w, wixData, wixSite) {

    return $w.onReady(function () {
        const context = wixSite.lightbox.getContext();

        const textContainer = $w('#textFields');
        const imageContainer = $w('#imageFields');

        var inputsByType = {
            "$w.Text": textContainer.children,
            "$w.Image": imageContainer.children
        }

        var groups = groupByType(context.components, {
            "$w.Text": [],
            "$w.Image": []
        });

        var allCollapse = textContainer.children.concat(imageContainer.children).map((comp) => {
            return comp.collapse();
        });

        Object.keys(groups).forEach((key) => {
            groups[key].forEach((comp, index) => {
                if (inputsByType[key][index]) {
                    inputsByType[key][index].expand();
                    bindEventsToForm(inputsByType[key][index], comp, context.page, key, index, context.itemId);
                }
            });
        });
    });

    function bindEventsToForm(typeForm, relatedComp, page, key, index, itemId) {

        var feildToComp = getAllComponents(typeForm).reduce((acc, comp) => {
            if (comp.type === '$w.Text') {
                acc['label'] = comp;
            }
            if (comp.type === '$w.TextInput') {
                acc[comp.placeholder] = comp;
            }
            if (comp.type === '$w.TextArea') {
                acc[comp.placeholder] = comp;
            }
            if (comp.type === "$w.FileUploader") {
                acc['imageuploader'] = comp;
            }
            if (comp.type === "$w.Image") {
                acc['imageuploader'] = comp;
                acc['image'] = comp;
            }
            return acc;
        }, {});

        var handlers = {
            "$w.Text": () => {
                feildToComp.label.text = relatedComp.id;
                feildToComp.text.value = relatedComp.text;
                function deferSave(e){
                    clearTimeout(deferSave.tmid);
                    deferSave.tmid = setTimeout(function(){
                        saveToDB(relatedComp, page, 'text', e.target.value, itemId)
                    }, 300);
                }
                feildToComp.text.onChange(deferSave);
            },
            "$w.Image": () => {
                feildToComp.label.text = relatedComp.id;
                feildToComp.image.src = relatedComp.src;
                feildToComp.imageuploader.buttonLabel = 'Upload Image';
                feildToComp.imageuploader.onChange(() => {
                    feildToComp.imageuploader.startUpload().then((uploadedFile) => {
                        feildToComp.image.src = uploadedFile.url;
                        saveToDB(relatedComp, page, 'src', uploadedFile.url, itemId);
                    });
                });
            }
        }

        handlers[key]();


        console.log(feildToComp);
    }

    function saveToDB(relatedComp, page, key, value, itemId) {
        console.log('saveToDB', relatedComp, page, key, value);
        const cmsKey = itemId ? '_' + itemId : page.title;
        wixData.get('cms', cmsKey).then((data) => {
            if (data) {
                if (data.components[relatedComp.id]) {
                    data.components[relatedComp.id].fields[key] = value;
                } else {
                    data.components[relatedComp.id] = { _id: relatedComp.id, component: relatedComp, fields: { [key]: value } };
                }
                wixData.update('cms', data);
            } else {
                wixData.insert('cms', {
                    _id: cmsKey, components: {
                        [relatedComp.id]: { _id: relatedComp.id, component: relatedComp, fields: { [key]: value } }
                    }
                });
            }
        });
    }
}

export function initWixWhite($w, wixData, wixSite) {

    const dbReady = pull();
    
    return $w.onReady(() => {
        dbReady.then(startSync);
    });


    function startSync(initialData) {
        initialData.items.forEach(updatePage);
        $w('#cmsbutton').onClick(openCMS);
        pullDBChanges((data) => {
            data.items.forEach(updatePage);
        });
    }


    function openCMS() {
        console.log('openCMS');
        const dataset = $w('#dynamicDataset')[0];
        const isDynamic = !!dataset;
        let dbItem;
        if (dataset) {
            dbItem = dataset.getCurrentItem();
        }
        const page = getCurrentPage();

        wixSite.lightbox.open('cms', {
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

    function getCurrentPage() {
        let comps = $w('Image');
        if (!comps.length) {
            comps = $w('Text');
        }
        let parent = comps.parent;
        while (parent && parent.type !== '$w.Page') {
            parent = parent.parent;
        }
        return parent;
    }

    function pull() {
        return wixData.query('cms').find();
    }

    function pullDBChanges(onData, interval = 500) {
        return setInterval(() => {
            pull().then(onData);
        }, interval);
    }

    function updatePage(page) {
        const dataset = $w('#dynamicDataset')[0];
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

}


function getAllComponents(element, exclude = [], comps = []) {
    element.children && element.children.forEach((comp) => {
        if (exclude.indexOf(comp.id) !== -1) { return; }
        comps.push(comp);
        getAllComponents(comp, exclude, comps);
    });
    return comps;
}

function groupByType(comp, acc) {
    return comp.reduce((g, comp) => {
        if (g[comp.type]) {
            g[comp.type].push(comp);
        }
        return g;
    }, acc);
}

function pageToJSON(page) {
    const {id, type, global, rendered, title, description, url, visibleInMenu} = page;
    return { id, type, global, rendered, title, description, url, visibleInMenu };
}