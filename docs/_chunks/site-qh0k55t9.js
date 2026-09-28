import{ut}from"./site-wsw4wdqb.js";import{Ll}from"./site-kp119hs5.js";import{a}from"./site-3ge18yeb.js";class pm extends Ll{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ut)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}a("FlowGraphKeyDownEventBlock",pm);
export{pm};

//# debugId=1C148DD0DA5D932A64756E2164756E21
//# sourceMappingURL=site-qh0k55t9.js.map
