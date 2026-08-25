import{En as a}from"./site-ejgmqdym.js";import{nu as o}from"./site-86tpqddf.js";import{sE as s}from"./site-yf4sr5jd.js";class p extends a{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",o)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}s("FlowGraphKeyDownEventBlock",p);
export{p as Cn};

//# debugId=509638B04156795C64756E2164756E21
//# sourceMappingURL=site-4wx9wkn7.js.map
