let pausePull = false;
    
export function initWixWhiteAddPage($w, wixData, wixSite, wixLocation) {

    // artists, exhibits

    $w.onReady(() => {
        const context = wixSite.lightbox.getContext();
        $w('#addartists').onClick(() => addPage('artists', context.lang));
        $w('#addexhibits').onClick(() => addPage('exhibits', context.lang));
    });

    function hidePreLoader(){
        var pl = $w('#preloader');
        pl.hide && pl.hide();
    }
    function showPreLoader(){
        var pl = $w('#preloader');
        pl.show && pl.show();
    }

    function addPage(collectionName, lang) {
        return wixData.query(collectionName)
            .find()
            .then(results => {
                const newItemIndex = results.totalCount + 1;
                const someItem = results.items[0] || {_id: 'undefined'};
                const newPageTitle = 'title-' + newItemIndex;

                pausePull = true;
                showPreLoader();

                return wixData
                    .insert(collectionName, {'title': newPageTitle}, {})
                    .then((generatedItem) => {
                        const cmsKey = getCmsKey(someItem._id, null, lang);
                        return wixData.get('cms', cmsKey)
                            .then((currentItem) => {
                                var newItem = addDefaultTextAndSrc(currentItem);
                                delete newItem._id;
                                return savePageItemToDB(wixData, null, newItem, generatedItem._id, lang);
                            });
                    })
                    .then(() => {
                        pausePull = false;
                        hidePreLoader();
                        wixLocation.to('/exhibits/' + newPageTitle)
                    });
            })

    }
}

export function initWixWhiteCMS($w, wixData, wixSite, wixStorage) {

    return $w.onReady(function () {
        const context = wixSite.lightbox.getContext();

        const textContainer = $w('#textFields');
        const imageContainer = $w('#imageFields');

        var inputsByType = {
            "$w.Text": textContainer.children || [],
            "$w.Image": imageContainer.children || []
        }

        var groups = groupByType(context.components, {
            "$w.Text": [],
            "$w.Image": []
        });

        var allCollapse = inputsByType["$w.Text"].concat(inputsByType["$w.Image"]).map((comp) => {
            return comp.collapse();
        });

        Object.keys(groups).forEach((key) => {
            groups[key].forEach((comp, index) => {
                if (inputsByType[key][index]) {
                    inputsByType[key][index].expand();
                    bindEventsToForm(inputsByType[key][index], comp, context.page, key, index, context.itemId, context.lang);
                }
            });
        });
    });

    function bindEventsToForm(typeForm, relatedComp, page, key, index, itemId, lang) {

        typeForm.onMouseIn(() => {
            wixStorage.session.setItem('blink', relatedComp.id);
        });

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
                feildToComp.label.text = relatedComp.id.replace(/^x\d+x/, '');
                feildToComp.text.value = relatedComp.text;
                function deferSave(e) {
                    clearTimeout(deferSave.tmid);
                    deferSave.tmid = setTimeout(function () {
                        saveToDB(wixData, relatedComp, page, 'text', e.target.value, itemId, lang)
                    }, 300);
                }

                feildToComp.text.onChange(deferSave);
            },
            "$w.Image": () => {
                //feildToComp.label.text = relatedComp.id;
                feildToComp.image.src = relatedComp.src;
                feildToComp.imageuploader.buttonLabel = 'Upload Image';
                feildToComp.imageuploader.onChange(() => {
                    pausePull = true;
                    feildToComp.imageuploader.startUpload().then((uploadedFile) => {
                        feildToComp.image.src = uploadedFile.url;
                        saveToDB(wixData, relatedComp, page, 'src', uploadedFile.url, itemId, lang).then(() => pausePull = false);
                    });
                });
            }
        }

        handlers[key]();
    }
}

export function initWixWhite($w, wixData, wixSite, wixStorage, wixUsers, wixWindow) {
    let lang = 'En';

    const cmsButtonsContainerId = '#cmsbuttons';
    const loginButtonId = '#loginbutton';
    const cmsButtonId = '#cmsbutton';
    const addPageId = '#addPage';
    const openContactId = '#openContact';

    const dbReady = pull();

    return $w.onReady(() => {
        console.log('ready site');
        dbReady.then(startSync);
        setInterval(blink, 100);
    });

    function loginOnClick() {
        wixUsers.login().then(toggleCMSButtons);
    }

    function showCMSButtons(interval = 300) {
        const buttonContainer = $w(cmsButtonsContainerId);
        buttonContainer.children.forEach((button, index, list) => {
            setTimeout(() => button.show('FloatIn'), wixWindow.formFactor === 'Mobile' ? 0 : (list.length - index + 1) * interval);
        })
    }

    function toggleCMSButtons(user) {
        if (user.role !== 'anonymous' || wixWindow.viewMode === 'Preview') {
            showCMSButtons();
        }
    }

    function blink() {
        let id = wixStorage.session.getItem('blink');
        if (id) {
            wixStorage.session.removeItem('blink');

            function flicker(comp, times = 2) {
                comp.hide();
                setTimeout(() => {
                    comp.show();
                    if (times > 1) {
                        setTimeout(() => {
                            flicker(comp, times - 1)
                        }, 100);
                    }
                }, 100);
            }

            flicker($w(`#${id}`));
        }
    }

    function setLangBTNs(newLang) {

        lang = newLang;
        
        $w('#langEn').label = lang === 'En' ? '(EN)' : 'EN';
        $w('#langFr').label = lang === 'Fr' ? '(KO)' : 'KO';
        $w('#langEs').label = lang === 'Es' ? '(ES)' : 'ES';
    }


    function bindMasterEvents() {
        setLangBTNs(lang);
        $w('#langEn').onClick(() => setLangBTNs('En'));
        $w('#langFr').onClick(() => setLangBTNs('Fr'));
        $w('#langEs').onClick(() => setLangBTNs('Es'));

        $w(openContactId).onClick(() => {
            wixSite.lightbox.open('contact', {}).then(bindMasterEvents);
        });
        $w(cmsButtonId).onClick(openCMS);
        $w(addPageId).onClick(openAddPage);
        $w(loginButtonId).onClick(loginOnClick);

    }

    function startSync([initialData, initialExhibits, initialArtists]) {
        bindMasterEvents();

        pullDBChanges(([cms, exhibits, artists]) => {
        	updatePage(cms.items, exhibits, artists);
        });
		
		updatePage(initialData.items, initialExhibits, initialArtists)
        
        wixUsers.getCurrent().then(toggleCMSButtons);
    }

    function openCMS() {
        console.log('openCMS');
        const dataset = $w('#dynamicDataset');
        const isDynamic = !!dataset;
        let dbItem;
        if (dataset.length !== 0) {
            dbItem = dataset.getCurrentItem();
        }
        const page = getCurrentPage();

        wixSite.lightbox.open('cms', {
                isDynamic,
                lang,
                itemId: dbItem && dbItem._id,
                page: pageToJSON(page),
                collection: 'cms',
                components: sortComponents(page)
            }
        ).then(bindMasterEvents);
    }

    function openAddPage(){
        wixSite.lightbox.open('addPage', {lang});
    }

    function sortComponents(page) {
        var comps = getAllComponents(page).map((comp) => comp.toJSON()).filter((comp) => {
            return comp.id.match(/^xxx/) === null;
        });

        var sortedComps = comps.filter(({id}) => id.match(/^x.*x/) !== null).sort(sortFn)
            .concat(comps.filter(({id}) => id.match(/^x.*x/) === null).sort(sortFn));

        return sortedComps

        function sortFn(a, b) {
            var idA = a.id;
            var idB = b.id;

            if (idA < idB)
                return -1;
            if (idA > idB)
                return 1;
            return 0;
        }

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
        return Promise.all([wixData.query('cms').find(), wixData.query('exhibits').find(), wixData.query('artists').find()]);
    }

    function pullDBChanges(onData, interval = 500) {
        return setInterval(() => {
        	if(pausePull){
        		return
        	}
            pull().then(onData);
        }, interval);
    }

    function updateGL(glID, collection, allPages, lang, path){
        if($w(glID).length !== 0){

            var imagesForGl = collection.items.reduce((acc, item)=>{
                allPages.forEach((page)=>{
                    if(page._id === getCmsKey(item._id, null, lang)){
                        for(var k in page.components){
                            if(page.components[k].fields.src){
                                acc.push({src: page.components[k].fields.src, title: item.title, link: '/' + path + '/' + item.title, width: 300, height: 300});
                                return;
                            }
                        }        				
                    }
                });
                return acc;
            }, []);
            
            $w(glID).clickAction = 'link';
            $w(glID).images = imagesForGl;
        }
    }

    function updatePage(allPages, exhibits, artists) {
        const dataset = $w('#dynamicDataset');
        let dbItem;
        if (dataset.length !== 0) {
            dbItem = dataset.getCurrentItem();
        }
        
        const page = allPages.filter((page)=>{
        	return dbItem ? (('_' + dbItem._id + '_' + lang) === page._id) : (page._id === $w('Page').title + '_' + lang);
        })[0];
        
        const components = page ? page.components : {};

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
        
        updateGL('#exhibits', exhibits, allPages, lang, 'exhibits');
        updateGL('#artists', artists, allPages, lang, 'artists');

        // if($w('#exhibits').length !== 0){

        // 	var imagesForGl = exhibits.items.reduce((acc, item)=>{
        // 		allPages.forEach((page)=>{
        // 			if(page._id === getCmsKey(item._id, null, lang)){
        // 				for(var k in page.components){
        // 					if(page.components[k].fields.src){
        // 						acc.push({src: page.components[k].fields.src, title: item.title, link: '/exhibits/' + item.title, width: 300, height: 300});
        // 						return;
        // 					}
        // 				}        				
        // 			}
        // 		});
        // 		return acc;
        // 	}, []);
        	
        // 	$w('#exhibits').clickAction = 'link';
        // 	$w('#exhibits').images = imagesForGl;
        // }
    }
}


function getAllComponents(element, exclude = [], comps = []) {
    element.children && element.children.forEach((comp) => {
        if (exclude.indexOf(comp.id) !== -1) {
            return;
        }
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
    return {id, type, global, rendered, title, description, url, visibleInMenu};
}

function saveToDB(wixData, relatedComp, page, key, value, itemId, lang = 'En') {
    const cmsKey = getCmsKey(itemId, page, lang);
    return wixData.get('cms', cmsKey).then((data) => {
        if (data) {
            if (data.components[relatedComp.id]) {
                data.components[relatedComp.id].fields[key] = value;
            } else {
                data.components[relatedComp.id] = {_id: relatedComp.id, component: relatedComp, fields: {[key]: value}};
            }
            return wixData.update('cms', data);
        } else {
            return wixData.insert('cms', {
                _id: cmsKey, components: {
                    [relatedComp.id]: {_id: relatedComp.id, component: relatedComp, fields: {[key]: value}}
                }
            });
        }
    });
}

function savePageItemToDB(wixData, page, newData, itemId, lang = 'En') {
    const cmsKey = getCmsKey(itemId, page, lang);
    return wixData.get('cms', cmsKey).then((data) => {
        if (data) {
            return wixData.update('cms', newData);
        } else {
            newData._id = cmsKey;
            return wixData.insert('cms', newData);
        }
    });
}

function getCmsKey(itemId, pageComp, lang) {
    return (itemId ? '_' + itemId : pageComp.title) + ('_' + lang);
}

function addDefaultTextAndSrc(pageItem) {
    const defaultText = "I'm a text";
    const defaultSrc = 'https://cdn.meme.am/cache/instances/folder852/67008852.jpg';

    const componentIds = Object.keys(pageItem.components);
    const updatedComponents = {};
    componentIds.forEach((compKey) => {
        const compItem = pageItem.components[compKey];
        const compFieldKeys = Object.keys(compItem.fields);
        let newFields = {};
        compFieldKeys.forEach((fieldKey) => {
            newFields[fieldKey] = fieldKey === 'text' ? defaultText : defaultSrc;
        });
        updatedComponents[compKey] = Object.assign({}, compItem, {
            fields: newFields
        });
    });
    return Object.assign({}, pageItem, {
        components: updatedComponents
    });
}