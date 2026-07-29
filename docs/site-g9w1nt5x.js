import{Ut as y}from"./site-2z5azex9.js";import{ku as v}from"./site-5mc4escc.js";import{sE as q}from"./site-tvqrtn5a.js";class z extends y{constructor(b){super(b);this.sound=this.registerDataInput("sound",v)}_execute(b,C){let j=this.sound.getValue(b);if(!j){this._reportError(b,"No sound provided"),this.out._activateSignal(b);return}if(j.state===5)j.resume();else if(j.state===2||j.state===3)j.pause();this.out._activateSignal(b)}getClassName(){return"FlowGraphPauseSoundBlock"}}var m=!1;function A(){if(m)return;m=!0,q("FlowGraphPauseSoundBlock",z)}A();
export{z as Nm,A as Om};

//# debugId=38CE4EB57614062F64756E2164756E21
//# sourceMappingURL=site-g9w1nt5x.js.map
