import{ct}from"./site-g82qva8f.js";import{Fl}from"./site-g0eavxm3.js";import{o}from"./site-3cf5tsfq.js";class wm extends Fl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ct)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",wm);
export{wm};

//# debugId=9422D22BBD725A9564756E2164756E21
//# sourceMappingURL=site-8t3j0s2x.js.map
