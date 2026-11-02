import{ct}from"./site-mb4g134k.js";import{Fl}from"./site-n0f8y7bs.js";import{o}from"./site-3k900c4f.js";class Am extends Fl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ct)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",Am);
export{Am};

//# debugId=095B4F9906A01A3F64756E2164756E21
//# sourceMappingURL=site-p9zhqcs6.js.map
