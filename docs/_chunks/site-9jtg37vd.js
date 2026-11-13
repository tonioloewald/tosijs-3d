import{ct}from"./site-67r40dmn.js";import{Fl}from"./site-90yb3nbg.js";import{o}from"./site-ars0s908.js";class Lm extends Fl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ct)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",Lm);
export{Lm};

//# debugId=9CB0A29C914E517F64756E2164756E21
//# sourceMappingURL=site-9jtg37vd.js.map
