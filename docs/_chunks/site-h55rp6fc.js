import{ct}from"./site-ge04ms28.js";import{Fl}from"./site-5bv12p0b.js";import{o}from"./site-bqt5vbzj.js";class Tm extends Fl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ct)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",Tm);
export{Tm};

//# debugId=136769D880BD124564756E2164756E21
//# sourceMappingURL=site-h55rp6fc.js.map
