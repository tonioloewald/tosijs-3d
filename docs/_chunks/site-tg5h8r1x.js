import{ct}from"./site-5stwdw2k.js";import{Fl}from"./site-dh9feqxc.js";import{o}from"./site-4gwmbhmj.js";class Bm extends Fl{constructor(e){super(e);this.type="KeyDown",this.isRepeat=this.registerDataOutput("isRepeat",ct)}_executeEvent(e,t){let r=t.event.repeat??!1;if(r&&this.config?.ignoreRepeat)return!0;return this.isRepeat.setValue(r,e),super._executeEvent(e,t)}getClassName(){return"FlowGraphKeyDownEventBlock"}}o("FlowGraphKeyDownEventBlock",Bm);
export{Bm};

//# debugId=DAFE7312AE1BDF8C64756E2164756E21
//# sourceMappingURL=site-tg5h8r1x.js.map
