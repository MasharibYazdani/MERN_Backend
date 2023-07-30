const { response } = require("express");
const users = require("../models/userSchema");
const moment = require("moment");
const csv = require("fast-csv");
const fs = require("fs");
const BASE_URL = process.env.BASE_URL;

//register user
exports.userpost = async (req, res) => {
  //   console.log(req.file);
  // console.log(req.body);

  const file = req.file.filename;
  const { fname, lname, email, mobile, location, status, gender } = req.body;

  if (
    !fname ||
    !lname ||
    !email ||
    !mobile ||
    !location ||
    !status ||
    !gender ||
    !file
  ) {
    res.status(401).json("All inputs are required");
  }

  try {
    const preuser = await users.findOne({ email: email });

    if (preuser) {
      res.status(401).json("User already exists");
    } else {
      const dateCreated = moment(new Date()).format("YYYY-MM-DD hh:mm:ss");

      const userdata = new users({
        fname,
        lname,
        email,
        mobile,
        location,
        status,
        gender,
        profile: file,
        dateCreated,
      });

      await userdata.save();
      res.status(200).json(userdata);
    }
  } catch (error) {
    res.status(401).json(error);
    console.log("catch block error");
  }
};

//usersget
exports.userget = async (req, res) => {
  const search = req.query.search || "";
  const gender = req.query.gender || "";
  const status = req.query.status || "";
  const sort = req.query.sort || "";
  const page = req.query.page || 1;
  const ITEM_PER_PAGE = 4;

  const query = {
    fname: { $regex: search, $options: "i" },
  };

  if (gender !== "All") {
    query.gender = gender;
  }

  if (status !== "All") {
    query.status = status;
  }

  try {
    const skip = (page - 1) * ITEM_PER_PAGE;

    const count = await users.countDocuments(query);

    const userdata = await users
      .find(query)
      .sort({ dateCreated: sort === "new" ? -1 : 1 })
      .limit(ITEM_PER_PAGE)
      .skip(skip);

    const pageCount = Math.ceil(count / ITEM_PER_PAGE);

    res.status(200).json({
      Pagination: {
        count,
        pageCount,
      },
      userdata,
    });
  } catch (error) {
    res.status(401).json(error);
  }
};

//single user get for profile page

exports.singleuserget = async (req, res) => {
  const { id } = req.params;
  try {
    const userdata = await users.findOne({ _id: id });
    res.status(200).json(userdata);
  } catch (error) {
    res.status(401).json(error);
  }
};

//useredit

exports.useredit = async (req, res) => {
  const { id } = req.params;
  const {
    fname,
    lname,
    email,
    mobile,
    location,
    status,
    gender,
    user_profile,
  } = req.body;

  const file = req.file ? req.file.filename : user_profile;
  const dateUpdated = moment(new Date()).format("YYYY-MM-DD hh:mm:ss");

  try {
    const updateuser = await users.findByIdAndUpdate(
      { _id: id },
      {
        fname,
        lname,
        email,
        mobile,
        location,
        status,
        gender,
        profile: file,
        dateUpdated,
      },
      {
        new: true,
      }
    );

    await updateuser.save();
    res.status(200).json(updateuser);
  } catch (error) {
    res.status(401).json(error);
  }
};

//Delete user

exports.userdelete = async (req, res) => {
  const { id } = req.params;

  try {
    const deleteuser = await users.findByIdAndDelete({ _id: id });
    res.status(200).json(deleteuser);
  } catch (error) {
    res.status(401).json(error);
  }
};

//Change status from homepage

exports.userstatus = async (req, res) => {
  const { id } = req.params;
  const { data } = req.body;

  try {
    const userStatusUpdate = await users.findByIdAndUpdate(
      { _id: id },
      { status: data },
      { new: true }
    );

    res.status(200).json(userStatusUpdate);
  } catch (error) {
    res.status(401).json(error);
  }
};

//Export user in csv file

exports.userExport = async (req, res) => {
  try {
    const userdata = await users.find();
    const csvStream = csv.format({ headers: true });

    if (!fs.existsSync("public/files/export/")) {
      if (!fs.existsSync("public/files")) {
        fs.mkdirSync("public/files/");
      }

      if (!fs.existsSync("public/files/export")) {
        fs.mkdirSync("./public/files/export/");
      }
    }

    const writableStream = fs.createWriteStream(
      "public/files/export/users.csv"
    );

    csvStream.pipe(writableStream);

    writableStream.on("finish", function () {
      res.json({
        downloadUrl: `${BASE_URL}/files/export/users.csv`,
      });
    });

    if (userdata.length > 0) {
      userdata.map((user) => {
        csvStream.write({
          FirstName: user.fname ? user.fname : "-",
          LastName: user.lname ? user.lname : "-",
          Email: user.email ? user.email : "-",
          Mobile: user.mobile ? user.mobile : "-",
          Gender: user.gender ? user.gender : "-",
          Status: user.status ? user.status : "-",
          Profile: user.profile ? user.profile : "-",
          Location: user.location ? user.location : "-",
          DateCreated: user.dateCreated ? user.dateCreated : "-",
          DateUpdated: user.dateUpdated ? user.dateUpdated : "-",
        });
      });
    }

    csvStream.end();
    writableStream.end();
  } catch (error) {
    res.status(401).json(error);
  }
};
