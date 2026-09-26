import{nt}from"./site-b66xxmk6.js";import{Wo}from"./site-w0c0qv0j.js";import{a}from"./site-pey1240t.js";class ep extends Wo{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",nt)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}a("FlowGraphKeyDownEventBlock",ep);
export{ep};

//# debugId=5F3A2D7AFFC7D75164756E2164756E21
//# sourceMappingURL=site-dfvr5qvx.js.map
