
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

        typeForm.onMouseIn(()=>{
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
                function deferSave(e){
                    clearTimeout(deferSave.tmid);
                    deferSave.tmid = setTimeout(function(){
                        saveToDB(relatedComp, page, 'text', e.target.value, itemId, lang)
                    }, 300);
                }
                feildToComp.text.onChange(deferSave);
            },
            "$w.Image": () => {
                //feildToComp.label.text = relatedComp.id;
                feildToComp.image.src = relatedComp.src;
                feildToComp.imageuploader.buttonLabel = 'Upload Image';
                feildToComp.imageuploader.onChange(() => {
                    feildToComp.imageuploader.startUpload().then((uploadedFile) => {
                        feildToComp.image.src = uploadedFile.url;
                        saveToDB(relatedComp, page, 'src', uploadedFile.url, itemId, lang);
                    });
                });
            }
        }

        handlers[key]();

    }

    function saveToDB(relatedComp, page, key, value, itemId, lang = 'En') {
        console.log('saveToDB', relatedComp.id, page && page.title, key, value, lang);
        const cmsKey = (itemId ? '_' + itemId : page.title) + ('_' + lang);
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

export function initWixWhite($w, wixData, wixSite, wixStorage, wixUsers, viewMode) {
    let lang = 'En';
    const cmsButtonsContainerId = '#cmsbuttons';
    const loginButtonId = '#loginbutton';
    const cmsButtonId = '#cmsbutton';
    const addPageId = '#addPage';
    const openContactId = '#openContact';
    const collectionDelimiter = '111';

    const dbReady = pull();

    return $w.onReady(() => {
        console.log('ready site');
        dbReady.then(startSync);
        setInterval(blink, 100);
    });

    function toggleAddPageButton() {
        const addPageButton = $w(addPageId);
        if (addPageButton.collapse) {
            const dataset = $w('#dynamicDataset');
            return dataset.length !== 0 ? addPageButton.expand() : addPageButton.collapse()
        }
        return Promise.resolve();
    }

    function loginOnClick(){
        wixUsers.login().then(toggleCMSButtons);
    }

    function showCMSButtons(interval = 300){
        const buttonContainer = $w(cmsButtonsContainerId);
        buttonContainer.children.forEach((button, index, list) => {
            setTimeout(() => button.show('FloatIn'), (list.length - index + 1) * interval);
        })
    }

    function toggleCMSButtons(user){
        toggleAddPageButton();
        if (user.role !== 'anonymous' || viewMode === 'Preview'){
            showCMSButtons();
        }
    }

    function blink(){
        let id = wixStorage.session.getItem('blink');
        if(id){
            wixStorage.session.removeItem('blink');

            function flicker(comp, times = 2){
                comp.hide();
                setTimeout(()=>{
                    comp.show();
                    if(times > 1){
                        setTimeout(()=>{flicker(comp, times-1)}, 100);
                    }
                }, 100);
            }
            flicker($w(`#${id}`));
        }
    }
    
    function bindMasterEvents(){
    	
    	$w('#langEn').onClick(()=>lang = 'En');
        $w('#langFr').onClick(()=>lang = 'Fr');
        $w('#langEs').onClick(()=>lang = 'Es');
		
		$w(openContactId).onClick(()=>{
            wixSite.lightbox.open('contact', {}).then(bindMasterEvents);
		});
        $w(cmsButtonId).onClick(openCMS);
        $w(addPageId).onClick(addPage);
        $w(loginButtonId).onClick(loginOnClick);

    }

    function startSync(initialData) {
       	bindMasterEvents();

        initialData.items.forEach(updatePage);

        pullDBChanges((data) => {
            data.items.forEach(updatePage);
        });

        initialData.items.forEach(updatePage);
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

	function sortComponents(page){
		var comps = getAllComponents(page).map((comp) => comp.toJSON()).filter((comp)=>{
        	return comp.id.match(/^xxx/) === null;
        });
        
        var sortedComps = comps.filter(({id})=>id.match(/^x.*x/) !== null).sort(sortFn)
        	.concat(comps.filter(({id})=>id.match(/^x.*x/) === null).sort(sortFn));
        
        console.log(sortedComps.map(({id})=>id));
        
        return sortedComps
        
        function sortFn(a,b){
        	var idA = a.id;
        	var idB = b.id;
        	
            if ( idA < idB)
                return -1;
            if ( idA > idB )
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
        return wixData.query('cms').find();
    }

    function pullDBChanges(onData, interval = 500) {
        return setInterval(() => {
            pull().then(onData);
        }, interval);
    }

    function updatePage(page) {
        const dataset = $w('#dynamicDataset');
        let dbItem;
        if (dataset.length !== 0) {
            dbItem = dataset.getCurrentItem();
        }

        const isMatchPage = dbItem ? (('_' + dbItem._id + '_' + lang) === page._id) : (page._id === $w('Page').title + '_' + lang);
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

    function addPage() {
        const page = getCurrentPage();
        const datasetIndex = page.children.findIndex((child) => child.type === 'dataset');
        if (datasetIndex === -1) {
            return;
        }
        const dataset = page.children[datasetIndex];
        const newItemIndex = dataset.getTotalCount() + 1;
        const collectionName = dataset.id.substr(0, dataset.id.indexOf(collectionDelimiter));
        wixData.insert(collectionName, {'title': 'title-' + newItemIndex}, {});
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

