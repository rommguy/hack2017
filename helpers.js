export function getAllComponents(element, exclude = [], comps = []){
    element.children && element.children.forEach((comp)=>{
        if(exclude.indexOf(comp.id) !== -1){return;}
        comps.push(comp);
        getAllComponents(comp, exclude, comps);
    });
    return comps;
}

export function groupByType(comp, acc){
    return comp.reduce((g, comp)=>{
        if(g[comp.type]){
            g[comp.type].push(comp);
        }
        return g;
    }, acc);
}
