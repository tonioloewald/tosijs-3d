import{ct}from"./site-rfjvxq2b.js";import{Fl}from"./site-8w654kst.js";import{o}from"./site-hcyxrnqg.js";class Im extends Fl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ct)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",Im);
export{Im};

//# debugId=1AB7849484297A9264756E2164756E21
//# sourceMappingURL=site-3af9pte9.js.map
