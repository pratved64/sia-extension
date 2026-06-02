import { ChangeEvent } from "react";

const TestDb = () => {
    const [source, setSource] = useState("");
    const [content, setContent] = useState("");

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        console.log(e.target);
    }

    return (
        <form>
            <input type="text" placeholder="source" id="source" name="source" onChange={handleChange}/> <br/>
            <input type="text" placeholder="content" id="content" name="content" onChange={handleChange}/>
            <button>Submit</button>
        </form>
    )
}

export default TestDb
