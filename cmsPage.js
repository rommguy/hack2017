import wixSite from 'wix-site';
import wixData from 'wix-data';
import {getAllComponents, groupByType} from 'public/helpers';


const typesToViewOrder = ['$w.Text', '$w.Image'];

$w.onReady(function () {
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

    var allCollapse = textContainer.children.concat(imageContainer.children).map((comp)=>{
            return comp.collapse();
    //return comp.collapse().then(()=>comp.hide());
});

    //Promise.all(allCollapse).then(()=>{
    Object.keys(groups).forEach((key)=>{
        groups[key].forEach((comp, index)=>{
            if(inputsByType[key][index]){
        inputsByType[key][index].expand()//.then(()=>inputsByType[key][index].show('FadeIn'));
        bindEventsToForm(inputsByType[key][index], comp, context.page, key, index, context.itemId);
    }
});
});
    //});
});

function bindEventsToForm(typeForm, relatedComp, page, key, index, itemId){

    var feildToComp = getAllComponents(typeForm).reduce((acc, comp)=>{
            if(comp.type === '$w.Text'){
        acc['label'] = comp;
    }
    if(comp.type === '$w.TextInput'){
        acc[comp.placeholder] = comp;
    }
    if(comp.type === '$w.TextArea'){
        acc[comp.placeholder] = comp;
    }
    if(comp.type === "$w.FileUploader"){
        acc['imageuploader'] = comp;
    }
    if(comp.type === "$w.Image"){
        acc['imageuploader'] = comp;
        acc['image'] = comp;
    }
    return acc;
}, {});

    var handlers = {
        "$w.Text": ()=>{
        feildToComp.label.text = relatedComp.id;
    feildToComp.text.value = relatedComp.text;
    feildToComp.text.onChange((e) => saveToDB(relatedComp, page, 'text', e.target.value, itemId));
},
    "$w.Image": ()=>{
        feildToComp.label.text = relatedComp.id;
        feildToComp.image.src = relatedComp.src;
        feildToComp.imageuploader.buttonLabel = 'Upload Image';
        feildToComp.imageuploader.onChange(()=>{
            feildToComp.imageuploader.startUpload().then((uploadedFile)=>{
            feildToComp.image.src = uploadedFile.url;
        saveToDB(relatedComp, page, 'src', uploadedFile.url, itemId);
    });
    });
    }
}

    handlers[key]();


    console.log(feildToComp);
}

function saveToDB(relatedComp, page, key, value, itemId){
    console.log('saveToDB', relatedComp, page, key, value);
    const cmsKey = '_' + itemId || page.title;
    wixData.get('cms', cmsKey).then((data)=>{
        if(data){
            if(data.components[relatedComp.id]){
                data.components[relatedComp.id].fields[key] = value;
            } else {
                data.components[relatedComp.id] = {_id: relatedComp.id, component: relatedComp, fields: {[key]: value}};
            }
            wixData.update('cms', data);
        } else {
            wixData.insert('cms', {_id: cmsKey, components: {
            [relatedComp.id]: {_id: relatedComp.id, component: relatedComp, fields: {[key]: value}}
        }});
}
});
}