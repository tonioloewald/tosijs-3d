import{it}from"./site-3hzw4f8j.js";import{O,V}from"./site-ge04ms28.js";import{o}from"./site-bqt5vbzj.js";class Jp extends it{constructor(t){super(t);this.body=this.registerDataInput("body",O),this.motionType=this.registerDataInput("motionType",V,2)}_execute(t,r){let e=this.body.getValue(t);if(!e){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}e.setMotionType(this.motionType.getValue(t)),this.out._activateSignal(t)}getClassName(){return"FlowGraphSetPhysicsMotionTypeBlock"}}var i=!1;function em(){if(i)return;i=!0,o("FlowGraphSetPhysicsMotionTypeBlock",Jp)}em();
export{Jp,em};

//# debugId=0B4BA00253314BBC64756E2164756E21
//# sourceMappingURL=site-rnff21qe.js.map
