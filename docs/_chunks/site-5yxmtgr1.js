import{ct}from"./site-6xzhcvhx.js";import{Fl}from"./site-tyzdk92b.js";import{o}from"./site-rtzsfcas.js";class wm extends Fl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ct)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",wm);
export{wm};

//# debugId=9422D22BBD725A9564756E2164756E21
//# sourceMappingURL=site-5yxmtgr1.js.map
