import{io as a}from"./site-7kvbt5k2.js";import{ot as o}from"./site-rrva3mwb.js";import{hG as s}from"./site-qd0cy957.js";class p extends a{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",o)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}s("FlowGraphKeyDownEventBlock",p);
export{p as ho};

//# debugId=A85663EE3CF7BCAF64756E2164756E21
//# sourceMappingURL=site-y7w0ajz6.js.map
