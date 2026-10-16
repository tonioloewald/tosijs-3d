import{lt}from"./site-p0tgjt0r.js";import{Ll}from"./site-wx9zdzrr.js";import{o}from"./site-zg1n9j37.js";class vm extends Ll{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",lt)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",vm);
export{vm};

//# debugId=F76F55C299EA19F164756E2164756E21
//# sourceMappingURL=site-33qrdx3a.js.map
