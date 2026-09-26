import{tt}from"./site-5tw2831p.js";import{I,k}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class Hp extends tt{constructor(t){super(t);this.body=this.registerDataInput("body",I),this.motionType=this.registerDataInput("motionType",k,2)}_execute(t,i){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var o=!1;function Xp(){if(o)return;o=!0,a("FlowGraphSetPhysicsMotionTypeBlock",Hp)}Xp();
export{Hp,Xp};

//# debugId=BFF53A1EF915CBAB64756E2164756E21
//# sourceMappingURL=site-nz5y7mnf.js.map
