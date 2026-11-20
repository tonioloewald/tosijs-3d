import{it}from"./site-x0v5x8t1.js";import{w}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Xp extends it{constructor(t){super(t);this.sound=this.registerDataInput("sound",w)}_execute(t,i){let r=this.sound.getValue(t);if(!r){this._reportError(t,"No sound provided"),this.out._activateSignal(t);return}r.stop(),this.out._activateSignal(t)}getClassName(){return"FlowGraphStopSoundBlock"}}var e=!1;function $p(){if(e)return;e=!0,o("FlowGraphStopSoundBlock",Xp)}$p();
export{Xp,$p};

//# debugId=0949B8AA856DA4AA64756E2164756E21
//# sourceMappingURL=site-kpp60v24.js.map
